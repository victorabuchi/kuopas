import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { serializeTenant } from '../../../../../lib/mobile-serializers';

// Mirrors src/app/(app)/communities/[communityId]/page.tsx. Messages are only
// returned to members, matching the page's join gate.
export async function GET(request: Request, { params }: { params: Promise<{ communityId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { communityId } = await params;

  const community = await db.orm.public.Community.where({ id: communityId })
    .include('members', (m) => m)
    .first();
  if (!community) return new Response('Community not found', { status: 404 });

  const isMember = community.members.some((m) => m.tenantId === session.tenantId);

  const messages = isMember
    ? await db.orm.public.CommunityMessage.where({ communityId })
        .include('sender', (s) => s)
        .orderBy((m) => m.sentAt.asc())
        .limit(200)
        .all()
    : [];

  return Response.json({
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      memberCount: community.members.length,
      isMember,
    },
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.sentAt,
      isOwn: m.senderId === session.tenantId,
      sender: serializeTenant(m.sender!),
    })),
  });
}
