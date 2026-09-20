'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';
import { isVerified } from './verification';
import { DIMENSIONS, parseDealbreakers } from './matching';

async function requireVerifiedTenant(): Promise<string> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!(await isVerified(session.tenantId))) redirect('/lease?tab=verify');
  return session.tenantId;
}

export async function saveMatchProfileAction(formData: FormData) {
  const tenantId = await requireVerifiedTenant();

  const values: Record<string, string> = {};
  for (const dim of DIMENSIONS) {
    const value = String(formData.get(dim.key) ?? '');
    if (!(dim.options as readonly string[]).includes(value)) throw new Error(`Answer every question (${dim.key})`);
    values[dim.key] = value;
  }
  const dealbreakers = parseDealbreakers(formData.getAll('dealbreaker').map(String).join(',')).join(',');
  const bio = String(formData.get('bio') ?? '').trim().slice(0, 300);
  const active = formData.get('active') === 'on';

  const data = {
    active,
    sleepSchedule: values['sleepSchedule']!,
    cleanliness: Number(values['cleanliness']),
    noiseTolerance: Number(values['noiseTolerance']),
    studyHabit: values['studyHabit']!,
    guestPolicy: values['guestPolicy']!,
    smoking: values['smoking']!,
    alcohol: values['alcohol']!,
    cooking: values['cooking']!,
    bio,
    dealbreakers,
    updatedAt: new Date().toISOString(),
  };

  const existing = await db.orm.public.MatchProfile.where({ tenantId }).first();
  if (existing) await db.orm.public.MatchProfile.where({ tenantId }).update(data);
  else await db.orm.public.MatchProfile.create({ tenantId, ...data });

  revalidatePath('/roommates');
  redirect('/roommates?tab=find&saved=1');
}

export async function connectAction(formData: FormData) {
  const tenantId = await requireVerifiedTenant();
  const toId = String(formData.get('toId') ?? '').trim();
  if (!toId || toId === tenantId) return;

  const target = await db.orm.public.MatchProfile.where({ tenantId: toId, active: true }).first();
  if (!target || !(await isVerified(toId))) throw new Error('This person is not available');

  const reverse = await db.orm.public.MatchConnection.where({ fromId: toId, toId: tenantId }).first();
  if (reverse) {
    if (reverse.status === 'pending') {
      await db.orm.public.MatchConnection.where({ id: reverse.id }).update({ status: 'accepted' });
    }
  } else {
    const existing = await db.orm.public.MatchConnection.where({ fromId: tenantId, toId }).first();
    if (!existing) await db.orm.public.MatchConnection.create({ fromId: tenantId, toId });
  }
  revalidatePath('/roommates');
}

export async function respondConnectionAction(formData: FormData) {
  const tenantId = await requireVerifiedTenant();
  const id = String(formData.get('id') ?? '').trim();
  const accept = formData.get('accept') === '1';

  const connection = await db.orm.public.MatchConnection.where({ id }).first();
  if (!connection || connection.toId !== tenantId || connection.status !== 'pending') return;

  await db.orm.public.MatchConnection.where({ id }).update({ status: accept ? 'accepted' : 'declined' });
  revalidatePath('/roommates');
}
