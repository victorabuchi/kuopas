'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { createContentReport } from './content-reports';

function safeReturn(value: FormDataEntryValue | null, fallback: string): string {
  const path = String(value ?? '');
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}

export async function blockUserAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const blockedId = String(formData.get('blockedId') ?? '');
  const back = safeReturn(formData.get('returnTo'), '/home');
  if (!blockedId || blockedId === session.tenantId) redirect(back);

  const target = await db.orm.public.Tenant.where({ id: blockedId }).first();
  if (target && !(await db.orm.public.UserBlock.where({ blockerId: session.tenantId, blockedId }).first())) {
    await db.orm.public.UserBlock.create({ blockerId: session.tenantId, blockedId });
  }
  revalidatePath('/', 'layout');
  redirect(back);
}

export async function unblockUserAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const blockedId = String(formData.get('blockedId') ?? '');
  const row = await db.orm.public.UserBlock.where({ blockerId: session.tenantId, blockedId }).first();
  if (row) await db.orm.public.UserBlock.where({ id: row.id }).delete();
  revalidatePath('/', 'layout');
  redirect(safeReturn(formData.get('returnTo'), '/settings'));
}

// Reports for direct and community messages. (Group chat and noticeboard have
// their own report tables.) A snapshot of the text is kept so moderators can
// still judge it after the sender edits or leaves.
export async function reportContentAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const kind = String(formData.get('kind') ?? '');
  const messageId = String(formData.get('messageId') ?? '');
  const back = safeReturn(formData.get('returnTo'), '/home');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 300) || null;

  await createContentReport(session.tenantId, kind, messageId, reason);
  revalidatePath('/staff/reports');
  redirect(`${back}${back.includes('?') ? '&' : '?'}reported=1`);
}

export async function resolveContentReportAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const report = await db.orm.public.ContentReport.where({ id }).first();
  if (!report || report.status !== 'open') return;

  if (decision === 'remove') {
    const now = new Date().toISOString();
    if (report.kind === 'direct') await db.orm.public.DirectMessage.where({ id: report.targetId }).update({ removedAt: now });
    if (report.kind === 'community') await db.orm.public.CommunityMessage.where({ id: report.targetId }).update({ removedAt: now });
  }
  await db.orm.public.ContentReport.where({ id }).update({ status: decision === 'remove' ? 'actioned' : 'dismissed' });
  revalidatePath('/staff/reports');
}
