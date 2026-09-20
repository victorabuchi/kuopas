import { db } from '../../../../prisma/db';
import { getMobileSession } from '../../../../lib/mobile-auth';

// Mirrors HouseholdPage in src/app/(app)/household/page.tsx. Balances and the
// chore wheel are worked out on the client from these rows.
export async function GET(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const me = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!me) return new Response('Tenant not found', { status: 404 });

  const members = (await db.orm.public.Tenant.where({ unitId: me.unitId }).all()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const bills = await db.orm.public.SharedBill.where({ unitId: me.unitId })
    .include('shares', (s) => s)
    .orderBy((b) => b.createdAt.desc())
    .limit(50)
    .all();

  const chores = await db.orm.public.Chore.where({ unitId: me.unitId })
    .include('tasks', (tk) => tk.orderBy((x) => x.dueDate.desc()))
    .orderBy((c) => c.createdAt.asc())
    .all();

  const group = await db.orm.public.ChatGroup.where({ unitId: me.unitId }).first();

  return Response.json({
    meId: me.id,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    bills: bills.map((b) => ({
      id: b.id,
      title: b.title,
      category: b.category,
      totalCents: b.totalCents,
      paidById: b.paidById,
      dueDate: b.dueDate,
      shares: b.shares.map((s) => ({ id: s.id, tenantId: s.tenantId, amountCents: s.amountCents, paidAt: s.paidAt })),
    })),
    chores: chores.map((c) => {
      const current = c.tasks.find((task) => !task.doneAt);
      return {
        id: c.id,
        title: c.title,
        everyDays: c.everyDays,
        current: current ? { id: current.id, assignedToId: current.assignedToId, dueDate: current.dueDate } : null,
      };
    }),
    chatGroupId: group?.id ?? null,
  });
}
