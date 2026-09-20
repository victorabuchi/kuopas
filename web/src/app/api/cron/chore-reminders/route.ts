import { NextResponse, type NextRequest } from 'next/server';
import { db } from '../../../../prisma/db';
import { sendPushToTenant } from '../../../../lib/push';

const DAY_MS = 24 * 60 * 60 * 1000;

// Call this once a day (a Render Cron Job or any scheduler) with
// Authorization: Bearer $CRON_SECRET. It pushes a reminder to everyone whose
// chore is due within a day or overdue, at most once every 24 hours per task.
export async function GET(request: NextRequest) {
  const secret = process.env['CRON_SECRET'];
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Not authorized', { status: 401 });
  }

  const now = Date.now();
  const horizon = new Date(now + DAY_MS).toISOString();
  const tasks = await db.orm.public.ChoreTask.where((t) => t.dueDate.lte(horizon))
    .include('chore', (c) => c)
    .all();

  let sent = 0;
  for (const task of tasks) {
    if (task.doneAt) continue;
    if (task.remindedAt && now - new Date(task.remindedAt).getTime() < DAY_MS) continue;

    const overdue = new Date(task.dueDate).getTime() < now;
    await sendPushToTenant(task.assignedToId, {
      title: overdue ? 'Chore overdue' : 'Chore due soon',
      body: `${task.chore?.title ?? 'A chore'} is ${overdue ? 'overdue' : 'due within a day'}.`,
      url: '/household?tab=chores',
    }).catch(() => undefined);
    await db.orm.public.ChoreTask.where({ id: task.id }).update({ remindedAt: new Date(now).toISOString() });
    sent++;
  }
  return NextResponse.json({ checked: tasks.length, reminded: sent });
}
