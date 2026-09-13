import { db } from '../prisma/db';

// Keeps (memberA, memberB) in a consistent order so the same pair of
// tenants always resolves to the same conversation regardless of who
// started it.
export async function getOrCreateConversation(tenantAId: string, tenantBId: string) {
  const [memberAId, memberBId] = [tenantAId, tenantBId].sort();

  const existing = await db.orm.public.DirectConversation.where({ memberAId, memberBId }).first();
  if (existing) return existing;

  return db.orm.public.DirectConversation.create({ memberAId, memberBId });
}

export function otherMemberId(conversation: { memberAId: string; memberBId: string }, selfId: string): string {
  return conversation.memberAId === selfId ? conversation.memberBId : conversation.memberAId;
}
