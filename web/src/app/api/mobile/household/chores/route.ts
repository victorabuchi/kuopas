import { db } from '../../../../../prisma/db';
import { getMobileSession } from '../../../../../lib/mobile-auth';

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors createChoreAction in src/lib/household-actions.ts.
export async function POST(request: Request) {
  const session = getMobileSession(request);
  if (!session) return new Response('Not signed in', { status: 401 });

  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) return new Response('Tenant not found', { status: 404 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? '').trim();
  const everyDays = Math.max(1, Math.min(60, Number(body?.everyDays) || 7));
  if (!title) return new Response('A chore name is required', { status: 400 });

  const chore = await db.orm.public.Chore.create({ unitId: tenant.unitId!, title, everyDays });
  await db.orm.public.ChoreTask.create({
    choreId: chore.id,
    assignedToId: tenant.id,
    dueDate: new Date(Date.now() + everyDays * DAY_MS).toISOString(),
  });

  return Response.json({ id: chore.id }, { status: 201 });
}
