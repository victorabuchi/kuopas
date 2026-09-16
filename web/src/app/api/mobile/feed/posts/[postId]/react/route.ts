import { db } from '../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../lib/mobile-auth';

// Mirrors reactToPostAction in src/lib/building-post-actions.ts (toggle).
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { postId } = await params;

  const existing = await db.orm.public.BuildingPostReaction.where({
    postId,
    tenantId: session.tenantId,
  }).first();

  if (existing) {
    await db.orm.public.BuildingPostReaction.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.BuildingPostReaction.create({ postId, tenantId: session.tenantId });
  }

  return new Response(null, { status: 204 });
}
