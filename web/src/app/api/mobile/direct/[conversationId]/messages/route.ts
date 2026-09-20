import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';

// Mirrors sendDirectMessageAction in src/lib/direct-message-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { conversationId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Message content is required', { status: 400 });

  const conversation = await db.orm.public.DirectConversation.where({ id: conversationId }).first();
  if (!conversation) return new Response('Conversation not found', { status: 404 });
  if (conversation.memberAId !== session.tenantId && conversation.memberBId !== session.tenantId) {
    return new Response('Not a participant in this conversation', { status: 403 });
  }

  const message = await db.orm.public.DirectMessage.create({ conversationId, senderId: session.tenantId, content });

  return Response.json(
    { id: message.id, content: message.content, sentAt: message.sentAt, isOwn: true },
    { status: 201 },
  );
}
