'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getLocale } from './i18n';
import { getLiving } from './living';
import { sendPushToTenant } from './push';
import { getWeekStart } from './booking-grid';
import { CLAUSES, CLEANING_AREAS, CLEANING_TEMPLATE, checklistCompletion, currentAgreement } from './flat';

async function member() {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant?.unitId) redirect('/apply');
  const flatmates = await db.orm.public.Tenant.where({ unitId: tenant.unitId }).all();
  return { tenant, unitId: tenant.unitId, flatmates };
}

function back(tab: string, extra = ''): never {
  revalidatePath('/household');
  redirect(`/household?tab=${tab}${extra}`);
}

// ---- Roommate agreement ----

export async function proposeAgreementAction(formData: FormData) {
  const { tenant, unitId, flatmates } = await member();
  if (flatmates.length < 2) return back('agreement');

  const values: Record<string, string> = {};
  for (const clause of CLAUSES) {
    const v = String(formData.get(clause.key) ?? '');
    if (!(clause.options as readonly string[]).includes(v)) return back('agreement', '&error=incomplete');
    values[clause.key] = v;
  }
  values['extra'] = String(formData.get('extra') ?? '').trim().slice(0, 300);

  const { draft, nextVersion } = await currentAgreement(unitId);
  if (draft) await db.orm.public.RoommateAgreement.where({ id: draft.id }).update({ status: 'superseded' });
  const agreement = await db.orm.public.RoommateAgreement.create({
    unitId,
    version: nextVersion,
    status: 'draft',
    clauses: JSON.stringify(values),
    createdById: tenant.id,
  });
  await db.orm.public.AgreementSignature.create({ agreementId: agreement.id, tenantId: tenant.id });
  for (const other of flatmates.filter((m) => m.id !== tenant.id)) {
    await sendPushToTenant(other.id, { title: 'Kuopas', body: `${tenant.name} proposed a flat agreement`, url: '/household?tab=agreement' }).catch(() => undefined);
  }
  return back('agreement');
}

export async function signAgreementAction(formData: FormData) {
  const { tenant, unitId, flatmates } = await member();
  const agreement = await db.orm.public.RoommateAgreement.where({ id: String(formData.get('id') ?? '') }).include('signatures', (s) => s).first();
  if (!agreement || agreement.unitId !== unitId || !['draft', 'active'].includes(agreement.status)) return back('agreement');
  if (agreement.signatures.some((s) => s.tenantId === tenant.id)) return back('agreement');

  await db.orm.public.AgreementSignature.create({ agreementId: agreement.id, tenantId: tenant.id });
  const signed = new Set([...agreement.signatures.map((s) => s.tenantId), tenant.id]);
  if (agreement.status === 'draft' && flatmates.every((m) => signed.has(m.id))) {
    const previous = await db.orm.public.RoommateAgreement.where({ unitId, status: 'active' }).all();
    for (const p of previous) await db.orm.public.RoommateAgreement.where({ id: p.id }).update({ status: 'superseded' });
    await db.orm.public.RoommateAgreement.where({ id: agreement.id }).update({ status: 'active', activatedAt: new Date().toISOString() });
    for (const m of flatmates) {
      await sendPushToTenant(m.id, { title: 'Kuopas', body: 'Your flat agreement is now active', url: '/household?tab=agreement' }).catch(() => undefined);
    }
  }
  return back('agreement');
}

// ---- Cleaning checklist ----

export async function setupCleaningAction() {
  const { unitId } = await member();
  const existing = await db.orm.public.CleaningItem.where({ unitId }).first();
  if (existing) return back('cleaning');
  const f = getLiving(await getLocale()).flat.cleaning;
  for (const row of CLEANING_TEMPLATE) {
    const label = (f.template as Record<string, string>)[`${row.area}.${row.key}`];
    if (label) await db.orm.public.CleaningItem.create({ unitId, area: row.area, label });
  }
  return back('cleaning');
}

export async function addCleaningItemAction(formData: FormData) {
  const { unitId } = await member();
  const area = String(formData.get('area') ?? 'other');
  const label = String(formData.get('label') ?? '').trim().slice(0, 80);
  if (!label || !(CLEANING_AREAS as readonly string[]).includes(area)) return back('cleaning');
  await db.orm.public.CleaningItem.create({ unitId, area, label });
  return back('cleaning');
}

export async function removeCleaningItemAction(formData: FormData) {
  const { unitId } = await member();
  const item = await db.orm.public.CleaningItem.where({ id: String(formData.get('id') ?? '') }).first();
  if (item && item.unitId === unitId) await db.orm.public.CleaningItem.where({ id: item.id }).update({ active: false });
  return back('cleaning');
}

export async function toggleCleaningAction(formData: FormData) {
  const { tenant, unitId } = await member();
  const item = await db.orm.public.CleaningItem.where({ id: String(formData.get('id') ?? '') }).first();
  if (!item || item.unitId !== unitId || !item.active) return back('cleaning');
  const weekStart = getWeekStart(new Date()).toISOString();
  const existing = await db.orm.public.CleaningLog.where({ itemId: item.id, weekStart }).first();
  if (existing) {
    // Only whoever ticked it can untick it.
    if (existing.tenantId === tenant.id) await db.orm.public.CleaningLog.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.CleaningLog.create({ itemId: item.id, tenantId: tenant.id, weekStart });
  }
  return back('cleaning');
}

// ---- Room transfer requests ----

const REASONS = ['dirty_kitchen', 'noise', 'conflict', 'safety', 'other'] as const;
const WANTS = ['studio', 'other_shared', 'any'] as const;

export async function requestTransferAction(formData: FormData) {
  const { tenant, unitId } = await member();
  const reason = String(formData.get('reason') ?? '');
  const wants = String(formData.get('wants') ?? '');
  const description = String(formData.get('description') ?? '').trim().slice(0, 600);
  const mediation = formData.get('mediation') === '1';
  if (!(REASONS as readonly string[]).includes(reason) || !(WANTS as readonly string[]).includes(wants) || !description) return back('transfer', '&error=incomplete');

  const open = (await db.orm.public.TransferRequest.where({ tenantId: tenant.id }).all()).find((r) => ['open', 'mediation'].includes(r.status));
  if (open) return back('transfer');

  const { active } = await currentAgreement(unitId);
  const rate = (await checklistCompletion(unitId, 4, new Date())) ?? 0;
  await db.orm.public.TransferRequest.create({
    tenantId: tenant.id,
    fromUnitId: unitId,
    wants,
    reason,
    description,
    triedAgreement: Boolean(active),
    checklistRate: rate,
    status: mediation ? 'mediation' : 'open',
  });
  revalidatePath('/staff/flats');
  return back('transfer', '&sent=1');
}

export async function withdrawTransferAction(formData: FormData) {
  const { tenant } = await member();
  const request = await db.orm.public.TransferRequest.where({ id: String(formData.get('id') ?? '') }).first();
  if (request && request.tenantId === tenant.id && ['open', 'mediation'].includes(request.status)) {
    await db.orm.public.TransferRequest.where({ id: request.id }).update({ status: 'withdrawn', decidedAt: new Date().toISOString() });
  }
  revalidatePath('/staff/flats');
  return back('transfer');
}
