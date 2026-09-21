'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';
import { sendPushToTenant } from './push';
import { moveTenantToUnit } from './relocate';
import { getLocale } from './i18n';
import { getLiving } from './living';
import { freeRooms } from './pods';

export async function decideTransferAction(formData: FormData) {
  const access = await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  const unitId = String(formData.get('unitId') ?? '').trim();

  const request = await db.orm.public.TransferRequest.where({ id }).first();
  if (!request || !['open', 'mediation'].includes(request.status)) redirect('/staff/flats');
  const now = new Date().toISOString();
  const notify = (body: string) => sendPushToTenant(request.tenantId, { title: 'Kuopas', body, url: '/household?tab=transfer' }).catch(() => undefined);

  if (decision === 'mediation') {
    await db.orm.public.TransferRequest.where({ id }).update({ status: 'mediation', staffNote: note, decidedById: access.staffId });
    await notify('Kuopas will help sort this out with your flat');
  } else if (decision === 'approve') {
    if (unitId) {
      const target = await db.orm.public.Unit.where({ id: unitId }).first();
      if (!target || (await freeRooms(unitId)) < 1) redirect('/staff/flats?error=unit');
      await moveTenantToUnit(request.tenantId, unitId);
    }
    await db.orm.public.TransferRequest.where({ id }).update({ status: 'approved', staffNote: note, decidedById: access.staffId, decidedAt: now });
    await notify(unitId ? 'Your transfer was approved and you have a new home' : 'Your transfer was approved, we will contact you when a home is ready');
  } else if (decision === 'decline') {
    await db.orm.public.TransferRequest.where({ id }).update({ status: 'declined', staffNote: note, decidedById: access.staffId, decidedAt: now });
    await notify('Your transfer request was reviewed');
  } else if (decision === 'resolved') {
    await db.orm.public.TransferRequest.where({ id }).update({ status: 'resolved', staffNote: note, decidedById: access.staffId, decidedAt: now });
    await notify('Your request was marked as resolved');
  }
  revalidatePath('/staff/flats');
  redirect('/staff/flats');
}

export async function nudgeFlatAction(formData: FormData) {
  await requireStaffAccess();
  const unitId = String(formData.get('unitId') ?? '');
  const body = getLiving(await getLocale()).flat.staff.nudgeBody;
  const residents = await db.orm.public.Tenant.where({ unitId }).all();
  for (const r of residents) await sendPushToTenant(r.id, { title: 'Kuopas', body, url: '/household?tab=agreement' }).catch(() => undefined);
  redirect('/staff/flats?nudged=1');
}
