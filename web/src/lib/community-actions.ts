'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../prisma/db';
import { getSession } from './session';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;
const MESSAGE_MAX = 2000;

export async function createCommunityAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (name.length < 3 || name.length > NAME_MAX) throw new Error('Name must be 3 to 50 characters');
  if (description.length > DESCRIPTION_MAX) throw new Error('Description is too long');

  const community = await db.orm.public.Community.create({
    name,
    description,
    createdById: session.tenantId,
  });
  await db.orm.public.CommunityMember.create({ communityId: community.id, tenantId: session.tenantId });

  revalidatePath('/communities');
  redirect(`/communities/${community.id}`);
}

export async function joinCommunityAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const communityId = String(formData.get('communityId') ?? '').trim();
  const community = await db.orm.public.Community.where({ id: communityId }).first();
  if (!community) throw new Error('Community not found');

  const existing = await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).first();
  if (!existing) {
    await db.orm.public.CommunityMember.create({ communityId, tenantId: session.tenantId });
  }

  revalidatePath('/communities');
  redirect(`/communities/${communityId}`);
}

export async function leaveCommunityAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const communityId = String(formData.get('communityId') ?? '').trim();
  await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).delete();

  revalidatePath('/communities');
  redirect('/communities');
}

export async function sendCommunityMessageAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const communityId = String(formData.get('communityId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!communityId || !content) throw new Error('Message content is required');
  if (content.length > MESSAGE_MAX) throw new Error('Message is too long');

  const membership = await db.orm.public.CommunityMember.where({ communityId, tenantId: session.tenantId }).first();
  if (!membership) throw new Error('Join this community to send messages');

  await db.orm.public.CommunityMessage.create({ communityId, senderId: session.tenantId, content });
  revalidatePath(`/communities/${communityId}`);
}
