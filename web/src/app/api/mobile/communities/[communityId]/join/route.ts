import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors joinCommunityAction in src/lib/community-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ communityId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { communityId } = await params;

  const community = await db.orm.public.Community.where({ id: communityId }).first();
  if (!community) return new Response('Community not found', { status: 404 });

  const existing = await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).first();
  if (!existing) {
    await db.orm.public.CommunityMember.create({ communityId, tenantId: session.tenantId });
  }

  return new Response(null, { status: 204 });
}
