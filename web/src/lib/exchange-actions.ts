'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { sendPushToTenant } from './push';
import { deletePrivateDocument, savePrivateDocument } from './uploads';
import { approveVerification } from './verification';
import { moveTenantToUnit } from './relocate';
import { createLeaseWithCharges } from './lease-create';
import { parseDay } from './lease';
import { EXCHANGE_PREFERENCES, freeTemporaryUnits } from './exchange';

function toApply(error?: string): never {
  revalidatePath('/apply/exchange');
  redirect(`/apply/exchange${error ? `?error=${error}` : '?saved=1'}`);
}

export async function submitExchangeAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenant = await db.orm.public.Tenant.where({ id: session.tenantId }).first();
  if (!tenant || tenant.unitId) redirect('/home');

  const homeUniversity = String(formData.get('homeUniversity') ?? '').trim().slice(0, 120);
  const homeCountry = String(formData.get('homeCountry') ?? '').trim().slice(0, 80) || null;
  const arrivalRaw = String(formData.get('arrival') ?? '');
  const departureRaw = String(formData.get('departure') ?? '');
  const prefer = String(formData.get('prefer') ?? 'any');
  const message = String(formData.get('message') ?? '').trim().slice(0, 400) || null;
  if (!homeUniversity || !arrivalRaw || !departureRaw) return toApply('required');

  const arrival = parseDay(arrivalRaw);
  const departure = parseDay(departureRaw);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime()) || departure.getTime() <= arrival.getTime()) return toApply('dates');

  const existing = await db.orm.public.ExchangeApplication.where({ tenantId: tenant.id }).first();
  if (existing && !['submitted', 'verified', 'waitlisted', 'cancelled', 'rejected'].includes(existing.status)) return toApply();

  const file = formData.get('letter') as File | null;
  const hasFile = Boolean(file && file.size > 0);
  if (!existing?.docPath && !hasFile) return toApply('letter');
  let docPath = existing?.docPath ?? null;
  if (hasFile) {
    await deletePrivateDocument(docPath);
    docPath = await savePrivateDocument(file, `exchange/${tenant.id}`);
  }

  const values = {
    homeUniversity,
    homeCountry,
    arrival: arrival.toISOString(),
    departure: departure.toISOString(),
    prefer: (EXCHANGE_PREFERENCES as readonly string[]).includes(prefer) ? prefer : 'any',
    message,
    docPath,
  };
  if (existing) {
    // Resubmitting after a cancellation or rejection puts it back in the queue.
    const reopened = ['cancelled', 'rejected'].includes(existing.status);
    await db.orm.public.ExchangeApplication.where({ id: existing.id }).update({
      ...values,
      ...(reopened ? { status: 'submitted', staffNote: null, decidedAt: null } : {}),
    });
  } else {
    await db.orm.public.ExchangeApplication.create({ tenantId: tenant.id, ...values });
  }
  revalidatePath('/staff/exchange');
  return toApply();
}

export async function cancelExchangeAction() {
  const session = await getSession();
  if (!session) redirect('/login');
  const app = await db.orm.public.ExchangeApplication.where({ tenantId: session.tenantId }).first();
  if (app && ['submitted', 'verified', 'waitlisted'].includes(app.status)) {
    await deletePrivateDocument(app.docPath);
    await db.orm.public.ExchangeApplication.where({ id: app.id }).update({ status: 'cancelled', docPath: null, decidedAt: new Date().toISOString() });
  }
  revalidatePath('/staff/exchange');
  return toApply();
}

function toStaff(extra = ''): never {
  revalidatePath('/staff/exchange');
  redirect(`/staff/exchange${extra}`);
}

export async function reviewExchangeAction(formData: FormData) {
  await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  const app = await db.orm.public.ExchangeApplication.where({ id }).first();
  if (!app || ['allocated', 'cancelled'].includes(app.status)) return toStaff();

  if (decision === 'verify' && app.status !== 'verified') {
    // The acceptance letter proves the person is a student at a Finnish university this term.
    const already = await db.orm.public.IdentityVerification.where({ tenantId: app.tenantId, status: 'approved' }).first();
    if (!already) await approveVerification(app.tenantId, 'exchange_letter', app.homeUniversity, 'Exchange acceptance letter');
    await db.orm.public.ExchangeApplication.where({ id }).update({ status: 'verified', staffNote: note });
  } else if (decision === 'waitlist') {
    await db.orm.public.ExchangeApplication.where({ id }).update({ status: 'waitlisted', staffNote: note });
  } else if (decision === 'reject') {
    await deletePrivateDocument(app.docPath);
    await db.orm.public.ExchangeApplication.where({ id }).update({ status: 'rejected', staffNote: note, docPath: null, decidedAt: new Date().toISOString() });
  }
  return toStaff();
}

function euroToCents(value: string): number {
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : -1;
}

async function allocate(appId: string, unitId: string, rentCents: number, depositCents: number): Promise<boolean> {
  const app = await db.orm.public.ExchangeApplication.where({ id: appId }).first();
  if (!app || ['allocated', 'cancelled', 'rejected'].includes(app.status)) return false;
  const free = await freeTemporaryUnits(app);
  if (!free.some((u) => u.id === unitId)) return false;

  await moveTenantToUnit(app.tenantId, unitId);
  const lease = await createLeaseWithCharges({
    tenantId: app.tenantId,
    unitId,
    kind: 'custom',
    start: new Date(app.arrival),
    end: new Date(app.departure),
    monthlyRentCents: rentCents,
    depositCents,
  });
  await deletePrivateDocument(app.docPath);
  await db.orm.public.ExchangeApplication.where({ id: appId }).update({
    status: 'allocated',
    allocatedUnitId: unitId,
    leaseId: lease.id,
    docPath: null,
    decidedAt: new Date().toISOString(),
  });
  await sendPushToTenant(app.tenantId, { title: 'Kuopas', body: 'Your exchange housing is ready', url: '/home' }).catch(() => undefined);
  return true;
}

export async function allocateExchangeAction(formData: FormData) {
  await requireStaffAccess();
  const rent = euroToCents(String(formData.get('rent') ?? ''));
  const deposit = euroToCents(String(formData.get('deposit') || '0'));
  if (rent < 0 || deposit < 0) return toStaff('?error=rent');
  const ok = await allocate(String(formData.get('id') ?? ''), String(formData.get('unitId') ?? ''), rent, deposit);
  return toStaff(ok ? '' : '?error=unit');
}

// Goes through the queue in arrival order and gives everyone the first free
// apartment that suits them. Applicants who do not fit go on the waiting list.
export async function allocateAllExchangeAction(formData: FormData) {
  await requireStaffAccess();
  const rent = euroToCents(String(formData.get('rent') ?? ''));
  const deposit = euroToCents(String(formData.get('deposit') || '0'));
  if (rent < 0 || deposit < 0) return toStaff('?error=rent');

  const queue = (await db.orm.public.ExchangeApplication.all())
    .filter((a) => ['verified', 'waitlisted'].includes(a.status))
    .sort((a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let allocated = 0;
  let waiting = 0;
  for (const app of queue) {
    const free = await freeTemporaryUnits(app);
    const pick = free[0];
    if (pick && (await allocate(app.id, pick.id, rent, deposit))) allocated += 1;
    else {
      if (app.status !== 'waitlisted') await db.orm.public.ExchangeApplication.where({ id: app.id }).update({ status: 'waitlisted' });
      waiting += 1;
    }
  }
  return toStaff(`?a=${allocated}&w=${waiting}`);
}
