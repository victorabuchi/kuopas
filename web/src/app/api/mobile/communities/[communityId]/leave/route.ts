import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors leaveCommunityAction in src/lib/community-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ communityId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { communityId } = await params;
  await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).delete();

  return new Response(null, { status: 204 });
}
