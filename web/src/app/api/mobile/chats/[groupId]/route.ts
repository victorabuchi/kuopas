import { blockedByMe } from '../../../../../lib/blocks';
import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';
import { serializeChatGroup, serializeMessage } from '../../../../../lib/mobile-serializers';

// Mirrors src/app/(app)/chat/[groupId]/page.tsx.
export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { groupId } = await params;

  const group = await db.orm.public.ChatGroup.where({ id: groupId })
    .include('members', (members) => members.include('tenant', (t) => t))
    .first();
  if (!group) return new Response('Chat not found', { status: 404 });

  const isMember = group.members.some((m) => m.tenant!.id === session.tenantId);
  if (!isMember) return new Response('Not a member of this chat', { status: 403 });

  const messages = await db.orm.public.Message.where({ chatGroupId: groupId })
    .include('sender', (s) => s)
    .include('reports', (r) => r)
    .orderBy((m) => m.sentAt.asc())
    .limit(200)
    .all();

  const blocked = await blockedByMe(session.tenantId);

  return Response.json({
    group: { ...serializeChatGroup(group), memberCount: group.members.length },
    // Removed messages keep their row (like the web page) but never send their text.
    messages: messages.filter((m) => !blocked.has(m.sender!.id)).map((m) => ({
      ...serializeMessage({ ...m, content: m.removedAt ? '' : m.content, sender: m.sender! }),
      removed: Boolean(m.removedAt),
      reported: m.reports.some((r) => r.reporterId === session.tenantId),
    })),
  });
}
