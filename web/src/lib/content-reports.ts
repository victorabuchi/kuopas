import { db } from '../prisma/db';

// Files a report for a direct or community message. Returns false when the
// reporter may not see the message, or it is their own.
export async function createContentReport(
  reporterId: string,
  kind: string,
  messageId: string,
  reason: string | null,
): Promise<boolean> {
  let content = '';
  let senderId: string | null = null;
  if (kind === 'direct') {
    const message = await db.orm.public.DirectMessage.where({ id: messageId }).first();
    const conversation = message ? await db.orm.public.DirectConversation.where({ id: message.conversationId }).first() : null;
    if (!message || !conversation || ![conversation.memberAId, conversation.memberBId].includes(reporterId)) return false;
    content = message.content;
    senderId = message.senderId;
  } else if (kind === 'community') {
    const message = await db.orm.public.CommunityMessage.where({ id: messageId }).first();
    const member = message ? await db.orm.public.CommunityMember.where({ communityId: message.communityId, tenantId: reporterId }).first() : null;
    if (!message || !member) return false;
    content = message.content;
    senderId = message.senderId;
  } else {
    return false;
  }
  if (senderId === reporterId) return false;

  const existing = (await db.orm.public.ContentReport.where({ targetId: messageId, reporterId }).all()).find((r) => r.kind === kind);
  if (!existing) {
    await db.orm.public.ContentReport.create({ kind, targetId: messageId, reportedUserId: senderId, reporterId, snapshot: content.slice(0, 500), reason });
  }
  return true;
}
