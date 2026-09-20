import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { serializeTenant } from '../../../../../../lib/mobile-serializers';

const MESSAGE_MAX = 2000;

// Mirrors sendCommunityMessageAction in src/lib/community-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ communityId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { communityId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Message content is required', { status: 400 });
  if (content.length > MESSAGE_MAX) return new Response('Message is too long', { status: 400 });

  const membership = await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).first();
  if (!membership) return new Response('Join this community to send messages', { status: 403 });

  const message = await db.orm.public.CommunityMessage.create({ communityId, senderId: session.tenantId, content });
  const sender = await db.orm.public.Tenant.where({ id: session.tenantId }).first();

  return Response.json(
    {
      id: message.id,
      content: message.content,
      sentAt: message.sentAt,
      isOwn: true,
      sender: serializeTenant(sender!),
    },
    { status: 201 },
  );
}
