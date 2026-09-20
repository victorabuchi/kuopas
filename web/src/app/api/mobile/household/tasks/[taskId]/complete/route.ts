import { db } from '../../../../../../../prisma/db';
import { getMobileSession } from '../../../../../../../lib/mobile-auth';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors completeChoreTaskAction in src/lib/household-actions.ts: marks the
// task done and passes the chore to the next person on the wheel.
export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const { taskId } = await params;
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });
  const members = (await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const task = await db.orm.public.ChoreTask.where({ id: taskId }).first();
  if (!task || task.doneAt) return new Response(null, { status: 204 });

  const chore = await db.orm.public.Chore.where({ id: task.choreId }).first();
  if (!chore || chore.unitId !== tenant.unitId) return new Response('Not allowed', { status: 403 });

  const now = Date.now();
  await db.orm.public.ChoreTask.where({ id: task.id }).update({ doneAt: new Date(now).toISOString() });

  const currentIndex = members.findIndex((m) => m.id === task.assignedToId);
  const next = members[(currentIndex + 1) % members.length]!;
  const scheduled = new Date(task.dueDate).getTime() + chore.everyDays * DAY_MS;
  await db.orm.public.ChoreTask.create({
    choreId: chore.id,
    assignedToId: next.id,
    dueDate: new Date(Math.max(scheduled, now + DAY_MS)).toISOString(),
  });

  return new Response(null, { status: 204 });
}
