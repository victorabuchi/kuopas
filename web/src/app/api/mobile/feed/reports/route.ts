import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

// Mirrors reportPostAction in src/lib/building-post-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const postId = String(body?.postId ?? '').trim() || null;
  const commentId = String(body?.commentId ?? '').trim() || null;
  const reason = String(body?.reason ?? '').trim() || null;

  if (!postId && !commentId) return new Response('Nothing to report', { status: 400 });

  await db.orm.public.BuildingPostReport.create({
    postId,
    commentId,
    reporterId: session.tenantId,
    reason,
  });

  return new Response(null, { status: 204 });
}
