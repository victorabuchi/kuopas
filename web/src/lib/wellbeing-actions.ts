'use server';

import { createHmac } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';

const CATEGORIES = ['mental_health', 'financial', 'behavioral', 'safety', 'other'];
const SEVERITIES = ['concern', 'urgent'];

async function requireAdmin() {
  const access = await requireStaffAccess();
  if (!access.isAdmin) throw new Error('Only an admin can do this');
  const staff = await db.orm.public.Staff.where({ id: access.staffId }).first();
  return { access, actor: staff?.name ?? 'Admin' };
}

async function logEvent(caseId: string, actor: string, action: string, detail: string | null) {
  await db.orm.public.WellbeingEvent.create({ caseId, actor, action, detail });
}

export async function submitWellbeingCaseAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const category = String(formData.get('category') ?? '');
  const severity = String(formData.get('severity') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  if (!CATEGORIES.includes(category) || !SEVERITIES.includes(severity) || !description) throw new Error('Fill in every field');

  const created = await db.orm.public.WellbeingCase.create({
    tenantId: session.tenantId,
    category,
    severity,
    description: description.slice(0, 4000),
    consentToShare: formData.get('consent') === 'on',
    origin: 'self',
  });
  await logEvent(created.id, 'Resident', 'created', null);

  revalidatePath('/wellbeing');
  revalidatePath('/admin/wellbeing');
  redirect('/wellbeing?sent=1');
}

export async function closeOwnCaseAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');
  const found = await db.orm.public.WellbeingCase.where({ id: String(formData.get('caseId') ?? '') }).first();
  if (!found || found.tenantId !== session.tenantId || found.status === 'closed') return;

  await db.orm.public.WellbeingCase.where({ id: found.id }).update({ status: 'closed' });
  await logEvent(found.id, 'Resident', 'closed', null);
  revalidatePath('/wellbeing');
  revalidatePath('/admin/wellbeing');
}

export async function flagResidentAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const category = String(formData.get('category') ?? '');
  const severity = String(formData.get('severity') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  if (!tenantId || !CATEGORIES.includes(category) || !SEVERITIES.includes(severity) || !description) throw new Error('Fill in every field');

  const created = await db.orm.public.WellbeingCase.create({
    tenantId,
    category,
    severity,
    description: description.slice(0, 4000),
    consentToShare: false,
    origin: 'staff',
  });
  await logEvent(created.id, actor, 'created', null);
  revalidatePath('/admin/wellbeing');
}

export async function updateCaseAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const caseId = String(formData.get('caseId') ?? '').trim();
  const found = await db.orm.public.WellbeingCase.where({ id: caseId }).first();
  if (!found) return;

  const intent = String(formData.get('intent') ?? '');
  if (intent === 'acknowledge' && found.status === 'open') {
    await db.orm.public.WellbeingCase.where({ id: caseId }).update({ status: 'acknowledged' });
    await logEvent(caseId, actor, 'acknowledged', null);
  } else if (intent === 'note') {
    const note = String(formData.get('note') ?? '').trim();
    if (note) await logEvent(caseId, actor, 'note', note.slice(0, 2000));
  } else if (intent === 'close') {
    await db.orm.public.WellbeingCase.where({ id: caseId }).update({ status: 'closed' });
    await logEvent(caseId, actor, 'closed', null);
  }
  revalidatePath('/admin/wellbeing');
  revalidatePath('/wellbeing');
}

export type WebhookResult = 'sent' | 'not_configured' | 'failed';

// Shares a case with campus student support through the configured webhook.
// Without the resident's consent, only a recorded reason allows it, and the
// payload then carries that reason so the receiver knows why.
export async function escalateCaseAction(formData: FormData) {
  const { actor } = await requireAdmin();
  const caseId = String(formData.get('caseId') ?? '').trim();
  const service = String(formData.get('service') ?? '').trim() || 'Campus student support';
  const reason = String(formData.get('reason') ?? '').trim();

  const found = await db.orm.public.WellbeingCase.where({ id: caseId }).first();
  if (!found || found.status === 'closed') return;
  if (!found.consentToShare && !reason) throw new Error('A reason is required to share without consent');

  const tenant = await db.orm.public.Tenant.where({ id: found.tenantId }).include('unit', (u) => u).first();

  const body = JSON.stringify({
    caseId: found.id,
    createdAt: found.createdAt,
    category: found.category,
    severity: found.severity,
    origin: found.origin,
    consentToShare: found.consentToShare,
    overrideReason: found.consentToShare ? null : reason,
    service,
    description: found.description,
    resident: tenant ? { name: tenant.name, email: tenant.email, apartment: tenant.unit?.code ?? null } : null,
  });

  let result: WebhookResult = 'not_configured';
  const url = process.env['WELLBEING_WEBHOOK_URL'];
  if (url) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env['WELLBEING_WEBHOOK_SECRET'];
    if (secret) headers['X-Kuopas-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      result = res.ok ? 'sent' : 'failed';
    } catch {
      result = 'failed';
    }
  }

  if (result !== 'failed') {
    await db.orm.public.WellbeingCase.where({ id: caseId }).update({
      status: 'escalated',
      escalatedTo: service,
      escalatedAt: new Date().toISOString(),
    });
  }
  await logEvent(
    caseId,
    actor,
    'escalated',
    `${service}: ${result}${found.consentToShare ? ' (with consent)' : ` (no consent, reason: ${reason})`}`,
  );
  revalidatePath('/admin/wellbeing');
  revalidatePath('/wellbeing');
}
