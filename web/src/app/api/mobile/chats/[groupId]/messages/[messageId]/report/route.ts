import { db } from '../../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../../lib/mobile-auth';

// Mirrors reportChatMessageAction in src/lib/household-actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string; messageId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { messageId } = await params;
  const body = await request.json().catch(() => null);

  const message = await db.orm.public.Message.where({ id: messageId }).first();
  if (!message || message.senderId === session.tenantId) return new Response(null, { status: 204 });

  const member = await db.orm.public.ChatGroupMember.where({
    tenantId: session.tenantId,
    chatGroupId: message.chatGroupId,
  }).first();
  if (!member) return new Response('Not allowed', { status: 403 });

  const existing = await db.orm.public.ChatMessageReport.where({ messageId, reporterId: session.tenantId }).first();
  if (!existing) {
    await db.orm.public.ChatMessageReport.create({
      messageId,
      reporterId: session.tenantId,
      reason: String(body?.reason ?? '').trim() || null,
    });
  }
  return new Response(null, { status: 204 });
}
