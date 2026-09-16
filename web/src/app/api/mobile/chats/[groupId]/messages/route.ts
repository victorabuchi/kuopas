import { db } from '../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../lib/mobile-auth';
import { serializeMessage } from '../../../../../../lib/mobile-serializers';

// Mirrors sendMessageAction in src/app/actions.ts.
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { groupId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Message content is required', { status: 400 });

  const membership = await db.orm.public.ChatGroupMember.where({
    tenantId: session.tenantId,
    chatGroupId: groupId,
  }).first();
  if (!membership) return new Response('Not a member of this chat group', { status: 403 });

  const created = await db.orm.public.Message.create({
    chatGroupId: groupId,
    senderId: session.tenantId,
    content,
  });

  const message = await db.orm.public.Message.where({ id: created.id })
    .include('sender', (s) => s)
    .first();

  return Response.json(serializeMessage({ ...message!, sender: message!.sender! }), { status: 201 });
}
