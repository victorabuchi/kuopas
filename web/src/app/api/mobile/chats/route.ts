import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { serializeChatGroup } from '../../../../lib/mobile-serializers';
import { displayNameFor } from '../../../../lib/names';

// Mirrors the "all" tab query in src/app/(app)/chats/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId })
    .include('memberships', (memberships) => memberships.include('chatGroup', (g) => g))
    .first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });

  const groupIds = tenant.memberships.map((m) => m.chatGroup!.id);
  const scopeByGroupId = new Map(tenant.memberships.map((m) => [m.chatGroup!.id, m.chatGroup!.scope]));

  const lastMessageByGroup = new Map<string, { senderName: string; content: string; sentAt: string }>();
  if (groupIds.length > 0) {
    const recent = await db.orm.public.Message.where((m) => m.chatGroupId.in(groupIds))
      .include('sender', (s) => s)
      .orderBy((m) => m.sentAt.desc())
      .limit(50)
      .all();
    for (const message of recent) {
      if (!lastMessageByGroup.has(message.chatGroupId)) {
        const scope = scopeByGroupId.get(message.chatGroupId) ?? 'building';
        lastMessageByGroup.set(message.chatGroupId, {
          senderName: displayNameFor(message.sender!, scope),
          content: message.content,
          sentAt: message.sentAt,
        });
      }
    }
  }

  const items = tenant.memberships.map((m) => ({
    membershipId: m.id,
    group: serializeChatGroup(m.chatGroup!),
    lastMessage: lastMessageByGroup.get(m.chatGroup!.id) ?? null,
  }));

  return Response.json(items);
}
