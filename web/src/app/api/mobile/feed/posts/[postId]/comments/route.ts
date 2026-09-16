import { db } from '../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../lib/mobile-auth';
import { serializeComment } from '../../../../../../../lib/mobile-serializers';

// Mirrors commentOnPostAction in src/lib/building-post-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });
  if (tenant.blockedFromNoticeboard) {
    return new Response('You are blocked from posting to the noticeboard', { status: 403 });
  }

  const { postId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Comment content is required', { status: 400 });

  const post = await db.orm.public.BuildingPost.where({ id: postId }).first();
  if (!post) return new Response('Post not found', { status: 404 });
  if (post.type !== 'noticeboard') return new Response('This post cannot be replied to', { status: 400 });

  const created = await db.orm.public.BuildingPostComment.create({
    postId,
    authorId: session.tenantId,
    content,
  });

  const comment = await db.orm.public.BuildingPostComment.where({ id: created.id })
    .include('author', (a) => a)
    .first();

  return Response.json(serializeComment({ ...comment!, author: comment!.author! }), { status: 201 });
}
