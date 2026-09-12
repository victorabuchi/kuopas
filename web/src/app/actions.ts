'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { createTenantWithGroups } from '../lib/groups';

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
  const senderId = String(formData.get('senderId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  if (!chatGroupId || !senderId || !content) {
    throw new Error('Sender and message content are required');
  }

  await db.orm.public.Message.create({ chatGroupId, senderId, content });
  revalidatePath(`/chat/${chatGroupId}`);
}
