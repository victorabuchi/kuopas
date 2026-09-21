'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { sendPushToTenant } from './push';
import { moveTenantToUnit } from './relocate';
import { eligibleApplicant, freeRooms, joinedPodFor, podMembers } from './pods';

function homes(error?: string): never {
  revalidatePath('/apply/homes');
  revalidatePath('/apply');
  redirect(`/apply/homes${error ? `?error=${error}` : ''}`);
}

export async function applyToUnitAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const tenantId = session.tenantId;
  if (!(await eligibleApplicant(tenantId))) return homes('verify');

  const unitId = String(formData.get('unitId') ?? '');
  const alone = formData.get('alone') === '1';
  const message = String(formData.get('message') ?? '').trim().slice(0, 300) || null;

  const unit = await db.orm.public.Unit.where({ id: unitId }).first();
  if (!unit || !unit.openForApplications) return homes();

  let pod = alone ? null : await joinedPodFor(tenantId);
  if (!pod) {
    // Applying on your own is a pod of one.
    const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
    const existing = await joinedPodFor(tenantId);
    if (existing) {
      const others = (await podMembers(existing.id)).filter((m) => m.status === 'joined' && m.tenantId !== tenantId);
      if (others.length > 0) return homes('leave-pod');
      pod = existing;
    } else {
      pod = await db.orm.public.Pod.create({ name: tenant?.name.split(' ')[0] ?? 'Solo', creatorId: tenantId, minScore: 0 });
      await db.orm.public.PodMember.create({ podId: pod.id, tenantId, status: 'joined' });
    }
  }
  if (pod.creatorId !== tenantId) return homes('organiser');

  const members = await podMembers(pod.id);
  if (members.some((m) => m.status === 'invited')) return homes('pod-not-ready');
  const joined = members.filter((m) => m.status === 'joined');
  if (joined.length > (await freeRooms(unitId))) return homes('too-big');

  const existing = await db.orm.public.PodApplication.where({ podId: pod.id, unitId }).first();
  if (existing && !['withdrawn', 'declined', 'rejected'].includes(existing.status)) return homes();
  if (existing) {
    await db.orm.public.PodApplication.where({ id: existing.id }).update({ status: 'submitted', message, staffNote: null, decidedAt: null });
  } else {
    await db.orm.public.PodApplication.create({ podId: pod.id, unitId, message });
  }
  await db.orm.public.Pod.where({ id: pod.id }).update({ status: 'applied' });
  revalidatePath('/staff/applications');
  return homes();
}

export async function withdrawApplicationAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const application = await db.orm.public.PodApplication.where({ id: String(formData.get('id') ?? '') }).first();
  const pod = application ? await db.orm.public.Pod.where({ id: application.podId }).first() : null;
  if (!application || !pod || pod.creatorId !== session.tenantId) return homes();
  if (!['submitted', 'offered'].includes(application.status)) return homes();
  await db.orm.public.PodApplication.where({ id: application.id }).update({ status: 'withdrawn' });
  revalidatePath('/staff/applications');
  return homes();
}

// Moves every joined member of the pod into the apartment.
async function housePod(applicationId: string, staffId: string | null) {
  const application = await db.orm.public.PodApplication.where({ id: applicationId }).first();
  if (!application || !['submitted', 'offered', 'accepted'].includes(application.status)) return 'gone';
  const members = (await podMembers(application.podId)).filter((m) => m.status === 'joined');
  if (members.length === 0 || members.length > (await freeRooms(application.unitId))) return 'full';

  for (const m of members) await moveTenantToUnit(m.tenantId, application.unitId);

  await db.orm.public.PodApplication.where({ id: applicationId }).update({
    status: 'housed',
    decidedById: staffId,
    decidedAt: new Date().toISOString(),
  });
  await db.orm.public.Pod.where({ id: application.podId }).update({ status: 'housed' });
  const others = await db.orm.public.PodApplication.where({ podId: application.podId }).all();
  for (const o of others) {
    if (o.id !== applicationId && ['submitted', 'offered', 'accepted'].includes(o.status)) {
      await db.orm.public.PodApplication.where({ id: o.id }).update({ status: 'withdrawn' });
    }
  }
  const unit = await db.orm.public.Unit.where({ id: application.unitId }).first();
  for (const m of members) {
    await sendPushToTenant(m.tenantId, { title: 'Kuopas', body: `Welcome home! Apartment ${unit?.code ?? ''} is yours.`, url: '/home' }).catch(() => undefined);
  }
  return 'ok';
}

export async function respondOfferAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');
  const application = await db.orm.public.PodApplication.where({ id: String(formData.get('id') ?? '') }).first();
  const pod = application ? await db.orm.public.Pod.where({ id: application.podId }).first() : null;
  if (!application || !pod || pod.creatorId !== session.tenantId || application.status !== 'offered') return homes();

  if (formData.get('accept') === '1') {
    const result = await housePod(application.id, null);
    if (result === 'ok') {
      revalidatePath('/staff/applications');
      redirect('/home');
    }
    return homes('full');
  }
  await db.orm.public.PodApplication.where({ id: application.id }).update({ status: 'declined', decidedAt: new Date().toISOString() });
  revalidatePath('/staff/applications');
  return homes();
}

// Staff side.
export async function decideApplicationAction(formData: FormData) {
  const access = await requireStaffAccess();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;

  const application = await db.orm.public.PodApplication.where({ id }).first();
  if (!application) return;
  const members = (await podMembers(application.podId)).filter((m) => m.status === 'joined');

  if (decision === 'offer' && application.status === 'submitted') {
    await db.orm.public.PodApplication.where({ id }).update({ status: 'offered', staffNote: note, decidedById: access.staffId, decidedAt: new Date().toISOString() });
    for (const m of members) {
      await sendPushToTenant(m.tenantId, { title: 'Kuopas', body: 'You have a housing offer', url: '/apply/homes' }).catch(() => undefined);
    }
  } else if (decision === 'reject' && ['submitted', 'offered'].includes(application.status)) {
    await db.orm.public.PodApplication.where({ id }).update({ status: 'rejected', staffNote: note, decidedById: access.staffId, decidedAt: new Date().toISOString() });
  } else if (decision === 'allocate') {
    await housePod(id, access.staffId);
  }
  revalidatePath('/staff/applications');
}
