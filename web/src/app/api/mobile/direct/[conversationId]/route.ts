import { blockedByMe, blockedEitherWay } from '../../../../../lib/blocks';
import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { otherMemberId } from '../../../../../lib/direct-messages';

// Mirrors src/app/(app)/messages/[conversationId]/page.tsx.
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { conversationId } = await params;

  const conversation = await db.orm.public.DirectConversation.where({ id: conversationId }).first();
  if (!conversation) return new Response('Conversation not found', { status: 404 });
  if (conversation.memberAId !== session.tenantId && conversation.memberBId !== session.tenantId) {
    return new Response('Not a participant in this conversation', { status: 403 });
  }

  const other = await db.orm.public.Tenant.where({ id: otherMemberId(conversation, session.tenantId) }).first();
  if (!other) return new Response('Conversation not found', { status: 404 });

  const messages = await db.orm.public.DirectMessage.where({ conversationId })
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  const iBlocked = (await blockedByMe(session.tenantId)).has(other.id);
  const blockedAny = await blockedEitherWay(session.tenantId, other.id);

  return Response.json({
    other: { id: other.id, name: other.name },
    blocked: { byMe: iBlocked, either: blockedAny },
    messages: (iBlocked ? [] : messages).map((m) => ({
      id: m.id,
      content: m.removedAt ? '' : m.content,
      removed: Boolean(m.removedAt),
      sentAt: m.sentAt,
      isOwn: m.senderId === session.tenantId,
    })),
  });
}
