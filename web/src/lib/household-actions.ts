'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { splitCents } from './split';

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant) throw new Error('Not signed in');
  const members = (await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return { tenant, members };
}

export async function createBillAction(formData: FormData) {
  const { tenant, members } = await requireMember();

  const title = String(formData.get('title') ?? '').trim();
  const category = String(formData.get('category') ?? 'other');
  const totalCents = Math.round(Number(String(formData.get('total') ?? '0').replace(',', '.')) * 100);
  if (!title || !Number.isFinite(totalCents) || totalCents <= 0) throw new Error('A title and a positive amount are required');

  const memberIds = new Set(members.map((m) => m.id));
  const chosen = formData.getAll('participant').map(String).filter((id) => memberIds.has(id));
  if (chosen.length === 0) throw new Error('Choose at least one person to split with');

  const weights = chosen.map((id) => {
    const w = Number(formData.get(`weight_${id}`));
    return Number.isFinite(w) && w > 0 ? w : 1;
  });
  const amounts = splitCents(totalCents, weights);

  const paidById = memberIds.has(String(formData.get('paidById') ?? '')) ? String(formData.get('paidById')) : tenant.id;
  const due = String(formData.get('dueDate') ?? '').trim();

  const bill = await db.orm.public.SharedBill.create({
    unitId: tenant.unitId,
    title,
    category,
    totalCents,
    paidById,
    dueDate: due ? new Date(due).toISOString() : null,
    note: String(formData.get('note') ?? '').trim() || null,
  });

  const now = new Date().toISOString();
  for (let i = 0; i < chosen.length; i++) {
    const id = chosen[i]!;
    await db.orm.public.BillShare.create({
      billId: bill.id,
      tenantId: id,
      amountCents: amounts[i]!,
      paidAt: id === paidById ? now : null,
    });
  }
  revalidatePath('/household');
}

export async function setSharePaidAction(formData: FormData) {
  const { tenant } = await requireMember();
  const share = await db.orm.public.BillShare.where({ id: String(formData.get('shareId') ?? '') })
    .include('bill', (b) => b)
    .first();
  if (!share?.bill) return;

  const bill = await db.orm.public.SharedBill.where({ id: share.billId }).first();
  if (!bill || bill.unitId !== tenant.unitId) throw new Error('Not allowed');
  if (share.tenantId !== tenant.id && bill.paidById !== tenant.id) throw new Error('Not allowed');

  await db.orm.public.BillShare.where({ id: share.id }).update({
    paidAt: formData.get('paid') === '1' ? new Date().toISOString() : null,
  });
  revalidatePath('/household');
}

export async function deleteBillAction(formData: FormData) {
  const { tenant } = await requireMember();
  const bill = await db.orm.public.SharedBill.where({ id: String(formData.get('billId') ?? '') }).first();
  if (!bill || bill.unitId !== tenant.unitId || bill.paidById !== tenant.id) throw new Error('Not allowed');
  await db.orm.public.SharedBill.where({ id: bill.id }).delete();
  revalidatePath('/household');
}

export async function createChoreAction(formData: FormData) {
  const { tenant, members } = await requireMember();
  const title = String(formData.get('title') ?? '').trim();
  const everyDays = Math.max(1, Math.min(60, Number(formData.get('everyDays')) || 7));
  if (!title) throw new Error('A chore name is required');

  const chore = await db.orm.public.Chore.create({ unitId: tenant.unitId, title, everyDays });
  const firstAssignee = members.find((m) => m.id === tenant.id) ?? members[0]!;
  await db.orm.public.ChoreTask.create({
    choreId: chore.id,
    assignedToId: firstAssignee.id,
    dueDate: new Date(Date.now() + everyDays * DAY_MS).toISOString(),
  });
  revalidatePath('/household');
}

// Marks the current task done and hands the chore to the next person in the
// rotation. The next due date follows the schedule, not the day it was done.
export async function completeChoreTaskAction(formData: FormData) {
  const { tenant, members } = await requireMember();
  const task = await db.orm.public.ChoreTask.where({ id: String(formData.get('taskId') ?? '') }).first();
  if (!task || task.doneAt) return;

  const chore = await db.orm.public.Chore.where({ id: task.choreId }).first();
  if (!chore || chore.unitId !== tenant.unitId) throw new Error('Not allowed');

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
  revalidatePath('/household');
}

export async function deleteChoreAction(formData: FormData) {
  const { tenant } = await requireMember();
  const chore = await db.orm.public.Chore.where({ id: String(formData.get('choreId') ?? '') }).first();
  if (!chore || chore.unitId !== tenant.unitId) throw new Error('Not allowed');
  await db.orm.public.Chore.where({ id: chore.id }).delete();
  revalidatePath('/household');
}

export async function reportChatMessageAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const messageId = String(formData.get('messageId') ?? '').trim();
  const message = await db.orm.public.Message.where({ id: messageId }).first();
  if (!message || message.senderId === session.tenantId) return;

  const member = await db.orm.public.ChatGroupMember.where({ tenantId: session.tenantId, chatGroupId: message.chatGroupId }).first();
  if (!member) throw new Error('Not allowed');

  const existing = await db.orm.public.ChatMessageReport.where({ messageId, reporterId: session.tenantId }).first();
  if (!existing) {
    await db.orm.public.ChatMessageReport.create({
      messageId,
      reporterId: session.tenantId,
      reason: String(formData.get('reason') ?? '').trim() || null,
    });
  }
  revalidatePath(`/chat/${message.chatGroupId}`);
  revalidatePath('/staff/reports');
}

export async function resolveChatReportAction(formData: FormData) {
  await requireStaffAccess();
  const report = await db.orm.public.ChatMessageReport.where({ id: String(formData.get('reportId') ?? '') }).first();
  if (!report) return;

  const decision = String(formData.get('decision') ?? '');
  if (decision === 'remove') {
    const message = await db.orm.public.Message.where({ id: report.messageId }).first();
    await db.orm.public.Message.where({ id: report.messageId }).update({ removedAt: new Date().toISOString() });
    const related = await db.orm.public.ChatMessageReport.where({ messageId: report.messageId }).all();
    for (const r of related) await db.orm.public.ChatMessageReport.where({ id: r.id }).update({ status: 'actioned' });
    if (message) revalidatePath(`/chat/${message.chatGroupId}`);
  } else {
    await db.orm.public.ChatMessageReport.where({ id: report.id }).update({ status: 'dismissed' });
  }
  revalidatePath('/staff/reports');
}
