import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

function serialize(m: { id: string; content: string; sentAt: string; senderTenantId: string | null }) {
  return { id: m.id, content: m.content, sentAt: m.sentAt, isOwn: Boolean(m.senderTenantId) };
}

// Mirrors ChatTab in src/app/(app)/messages/page.tsx (the "Kuopas" chat).
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const thread = await db.orm.public.DirectNoticeThread.where({ tenantId: session.tenantId }).first();
  const messages = thread
    ? await db.orm.public.DirectNoticeMessage.where({ threadId: thread.id })
        .orderBy((m) => m.sentAt.asc())
        .limit(200)
        .all()
    : [];

  return Response.json(messages.map(serialize));
}

// Mirrors replyToNoticeAction in src/lib/direct-notice-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? '').trim();
  if (!content) return new Response('Message content is required', { status: 400 });

  const thread =
    (await db.orm.public.DirectNoticeThread.where({ tenantId: session.tenantId }).first()) ??
    (await db.orm.public.DirectNoticeThread.create({ tenantId: session.tenantId }));

  const message = await db.orm.public.DirectNoticeMessage.create({
    threadId: thread.id,
    senderTenantId: session.tenantId,
    content,
  });

  return Response.json(serialize(message), { status: 201 });
}
