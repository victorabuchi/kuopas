import { blockedByMe, blockedEitherWay } from '../../../../lib/blocks';
import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';
import { getOrCreateConversation, otherMemberId } from '../../../../lib/direct-messages';
import { getTenantWithBuilding } from '../../../../lib/mobile-http';

// Mirrors DirectTab in src/app/(app)/messages/page.tsx.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });
  const tenantId = session.tenantId;

  const found = await getTenantWithBuilding(tenantId);
  if (!found) return new Response('Tenant not found', { status: 404 });
  const { building } = found;

  const asA = await db.orm.public.DirectConversation.where((c) => c.memberAId.eq(tenantId)).all();
  const asB = await db.orm.public.DirectConversation.where((c) => c.memberBId.eq(tenantId)).all();
  const allConversations = [...asA, ...asB];

  const otherIds = allConversations.map((c) => otherMemberId(c, tenantId));
  const others = otherIds.length === 0 ? [] : await db.orm.public.Tenant.where((t) => t.id.in(otherIds)).all();
  const otherById = new Map(others.map((t) => [t.id, t]));

  const rows = await Promise.all(
    allConversations.map(async (c) => {
      const lastMessage = await db.orm.public.DirectMessage.where({ conversationId: c.id })
        .orderBy((m) => m.sentAt.desc())
        .first();
      return { conversation: c, other: otherById.get(otherMemberId(c, tenantId)), lastMessage };
    }),
  );
  rows.sort((a, b) => {
    const at = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0;
    return bt - at;
  });

  const blockedIds = await blockedByMe(tenantId);
  const allTenants = await db.orm.public.Tenant.include('unit', (unit) => unit.include('stairwell', (s) => s)).all();
  const alreadyMessaging = new Set(otherIds);
  const contacts = allTenants.filter(
    (t) => t.id !== tenantId && t.unit?.stairwell?.buildingId === building.id && !alreadyMessaging.has(t.id) && !blockedIds.has(t.id),
  );

  return Response.json({
    buildingName: building.name,
    conversations: rows.flatMap(({ conversation, other, lastMessage }) =>
      other && !blockedIds.has(other.id)
        ? [
            {
              id: conversation.id,
              other: { id: other.id, name: other.name },
              lastMessage: lastMessage ? { content: lastMessage.content, sentAt: lastMessage.sentAt } : null,
            },
          ]
        : [],
    ),
    contacts: contacts.map((t) => ({ id: t.id, name: t.name })),
  });
}

// Mirrors startConversationAction in src/lib/direct-message-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const body = await request.json().catch(() => null);
  const otherTenantId = String(body?.otherTenantId ?? '');
  if (!otherTenantId || otherTenantId === session.tenantId) return new Response('Invalid recipient', { status: 400 });

  if (await blockedEitherWay(session.tenantId, otherTenantId)) return new Response('You cannot message this person', { status: 403 });
  const conversation = await getOrCreateConversation(session.tenantId, otherTenantId);
  return Response.json({ id: conversation.id });
}
