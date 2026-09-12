'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { createTenantWithGroups } from '../lib/groups';
import { getSession } from '../lib/session';

export async function createTenantAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const unitId = String(formData.get('unitId') ?? '').trim();

  if (!name || !email || !unitId) {
    throw new Error('Name, email, and unit are all required');
  }

  await createTenantWithGroups({ name, email, unitId });
  revalidatePath('/dashboard');
}

export async function sendMessageAction(formData: FormData) {
  const chatGroupId = String(formData.get('chatGroupId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  if (!chatGroupId || !content) {
    throw new Error('Message content is required');
  }

  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const membership = await db.orm.public.ChatGroupMember.where({
    tenantId: session.tenantId,
    chatGroupId,
  }).first();
  if (!membership) throw new Error('Not a member of this chat group');

  await db.orm.public.Message.create({ chatGroupId, senderId: session.tenantId, content });
  revalidatePath(`/chat/${chatGroupId}`);
}
