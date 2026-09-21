'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { sendPushToTenant } from './push';
import { POD_MAX, eligibleApplicant, joinedPodFor, loadProfiles, pairFit, podMembers } from './pods';

async function requireApplicant(): Promise<string> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!(await eligibleApplicant(session.tenantId))) redirect('/apply/verify');
  return session.tenantId;
}

function done(): never {
  revalidatePath('/apply/pods');
  revalidatePath('/apply');
  redirect('/apply/pods');
}

export async function createPodAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const name = String(formData.get('name') ?? '').trim().slice(0, 60);
  const minScore = Math.max(0, Math.min(95, Number.parseInt(String(formData.get('minScore') ?? '60'), 10) || 60));
  if (!name) return done();
  if (!(await db.orm.public.MatchProfile.where({ tenantId }).first())) redirect('/apply/roommates');
  if (await joinedPodFor(tenantId)) return done();

  const pod = await db.orm.public.Pod.create({ name, creatorId: tenantId, minScore });
  await db.orm.public.PodMember.create({ podId: pod.id, tenantId, status: 'joined' });
  return done();
}

export async function invitePodAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const podId = String(formData.get('podId') ?? '');
  const inviteeId = String(formData.get('inviteeId') ?? '');

  const pod = await db.orm.public.Pod.where({ id: podId }).first();
  if (!pod || pod.creatorId !== tenantId || pod.status !== 'forming') return done();
  if (inviteeId === tenantId || !(await eligibleApplicant(inviteeId))) return done();
  if (await joinedPodFor(inviteeId)) return done();

  const members = await podMembers(podId);
  const live = members.filter((m) => m.status === 'joined' || m.status === 'invited');
  if (live.length >= POD_MAX || live.some((m) => m.tenantId === inviteeId)) return done();

  // The invitee must not clash with anyone already in the pod.
  const ids = [inviteeId, ...members.filter((m) => m.status === 'joined').map((m) => m.tenantId)];
  const profiles = await loadProfiles(ids);
  const invitee = profiles.get(inviteeId);
  if (!invitee || !invitee.active) return done();
  for (const id of ids.slice(1)) {
    const other = profiles.get(id);
    if (other && pairFit(invitee, other).blocked) return done();
  }

  const existing = members.find((m) => m.tenantId === inviteeId);
  if (existing) await db.orm.public.PodMember.where({ id: existing.id }).update({ status: 'invited', invitedById: tenantId });
  else await db.orm.public.PodMember.create({ podId, tenantId: inviteeId, status: 'invited', invitedById: tenantId });

  await sendPushToTenant(inviteeId, { title: 'Kuopas', body: `Pod invitation: ${pod.name}`, url: '/apply/pods' }).catch(() => undefined);
  return done();
}

export async function respondPodInviteAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const memberId = String(formData.get('memberId') ?? '');
  const accept = formData.get('accept') === '1';

  const member = await db.orm.public.PodMember.where({ id: memberId }).first();
  if (!member || member.tenantId !== tenantId || member.status !== 'invited') return done();

  if (!accept) {
    await db.orm.public.PodMember.where({ id: memberId }).update({ status: 'declined' });
    return done();
  }
  if (await joinedPodFor(tenantId)) return done();
  if (!(await db.orm.public.MatchProfile.where({ tenantId }).first())) redirect('/apply/roommates');

  const members = await podMembers(member.podId);
  if (members.filter((m) => m.status === 'joined').length >= POD_MAX) return done();
  await db.orm.public.PodMember.where({ id: memberId }).update({ status: 'joined' });
  return done();
}

export async function leavePodAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const podId = String(formData.get('podId') ?? '');
  const member = await db.orm.public.PodMember.where({ podId, tenantId }).first();
  const pod = await db.orm.public.Pod.where({ id: podId }).first();
  if (!member || !pod || pod.creatorId === tenantId) return done();
  await db.orm.public.PodMember.where({ id: member.id }).delete();
  return done();
}

export async function removePodMemberAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const podId = String(formData.get('podId') ?? '');
  const memberId = String(formData.get('memberId') ?? '');
  const pod = await db.orm.public.Pod.where({ id: podId }).first();
  const member = await db.orm.public.PodMember.where({ id: memberId }).first();
  if (!pod || pod.creatorId !== tenantId || !member || member.podId !== podId || member.tenantId === tenantId) return done();
  await db.orm.public.PodMember.where({ id: memberId }).delete();
  return done();
}

export async function disbandPodAction(formData: FormData) {
  const tenantId = await requireApplicant();
  const pod = await db.orm.public.Pod.where({ id: String(formData.get('podId') ?? '') }).first();
  if (!pod || pod.creatorId !== tenantId) return done();
  await db.orm.public.Pod.where({ id: pod.id }).delete();
  return done();
}
