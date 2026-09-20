'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';
import { saveMediaUpload } from './uploads';
import { LEASE_KINDS, buildCharges, parseDay, presetDates, type LeaseKind } from './lease';

function euroToCents(value: string): number {
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isFinite(cents) || cents < 0) throw new Error('Invalid amount');
  return cents;
}

export async function createLeaseAction(formData: FormData) {
  await requireStaffAccess();

  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const kind = String(formData.get('kind') ?? '') as LeaseKind;
  if (!LEASE_KINDS.includes(kind)) throw new Error('Invalid lease type');

  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error('Tenant not found');

  let start: Date;
  let end: Date;
  const customStart = String(formData.get('startDate') ?? '').trim();
  const customEnd = String(formData.get('endDate') ?? '').trim();
  if (customStart && customEnd) {
    start = parseDay(customStart);
    end = parseDay(customEnd);
  } else {
    const year = Number(formData.get('year')) || new Date().getUTCFullYear();
    ({ start, end } = presetDates(kind, year));
  }
  if (end.getTime() < start.getTime()) throw new Error('End date must be after the start date');

  const monthlyRentCents = euroToCents(String(formData.get('rent') ?? '0'));
  const depositCents = euroToCents(String(formData.get('deposit') || '0'));
  const upfrontMonths = Math.max(0, Math.min(12, Number(formData.get('upfrontMonths')) || 0));

  const lease = await db.orm.public.Lease.create({
    tenantId,
    unitId: tenant.unitId,
    kind,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    monthlyRentCents,
    depositCents,
    upfrontMonths,
    status: 'active',
  });

  for (const charge of buildCharges(start, end, monthlyRentCents)) {
    await db.orm.public.LeaseCharge.create({
      leaseId: lease.id,
      periodStart: charge.periodStart.toISOString(),
      periodEnd: charge.periodEnd.toISOString(),
      amountCents: charge.amountCents,
      prorated: charge.prorated,
      dueDate: charge.dueDate.toISOString(),
    });
  }

  revalidatePath('/staff/leases');
  revalidatePath('/lease');
}

export async function setLeaseStatusAction(formData: FormData) {
  await requireStaffAccess();
  const status = String(formData.get('status') ?? '');
  if (!['active', 'ended', 'cancelled'].includes(status)) throw new Error('Invalid status');
  await db.orm.public.Lease.where({ id: String(formData.get('id') ?? '') }).update({ status });
  revalidatePath('/staff/leases');
  revalidatePath('/lease');
}

export async function markChargePaidAction(formData: FormData) {
  await requireStaffAccess();
  const paid = formData.get('paid') === '1';
  await db.orm.public.LeaseCharge.where({ id: String(formData.get('id') ?? '') }).update({
    paidAt: paid ? new Date().toISOString() : null,
  });
  revalidatePath('/staff/leases');
  revalidatePath('/lease');
}

export async function addUnitMediaAction(formData: FormData) {
  await requireStaffAccess();
  const unitId = String(formData.get('unitId') ?? '').trim();
  const media = await saveMediaUpload(formData.get('file') as File | null, `units/${unitId}`);
  if (!media) throw new Error('Choose a photo or video');
  await db.orm.public.UnitMedia.create({
    unitId,
    url: media.url,
    kind: media.kind,
    caption: String(formData.get('caption') ?? '').trim() || null,
  });
  revalidatePath('/staff/leases');
  revalidatePath('/lease');
}

export async function createTermAction(formData: FormData) {
  await requireStaffAccess();
  const name = String(formData.get('name') ?? '').trim();
  const kind = String(formData.get('kind') ?? '') as LeaseKind;
  if (!name || !LEASE_KINDS.includes(kind)) throw new Error('Name and type are required');
  const get = (key: string) => parseDay(String(formData.get(key) ?? '')).toISOString();
  await db.orm.public.AcademicTerm.create({
    name,
    kind,
    startDate: get('startDate'),
    endDate: get('endDate'),
    moveInFrom: get('moveInFrom'),
    moveInTo: get('moveInTo'),
  });
  revalidatePath('/staff/leases');
}

export async function deleteTermAction(formData: FormData) {
  await requireStaffAccess();
  await db.orm.public.AcademicTerm.where({ id: String(formData.get('id') ?? '') }).delete();
  revalidatePath('/staff/leases');
}

