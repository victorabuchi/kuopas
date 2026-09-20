import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

// Mirrors markPostsReadAction in src/lib/building-post-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const postIds: string[] = Array.isArray(body?.postIds) ? body.postIds.map(String) : [];

  for (const postId of postIds) {
    const existing = await db.orm.public.BuildingPostRead.where({ postId, tenantId: session.tenantId }).first();
    if (!existing) {
      await db.orm.public.BuildingPostRead.create({ postId, tenantId: session.tenantId });
    }
  }

  return new Response(null, { status: 204 });
}
