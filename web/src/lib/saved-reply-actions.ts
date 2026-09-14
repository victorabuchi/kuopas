'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { requireStaffAccess } from './portal-access';

export async function createSavedReplyAction(formData: FormData) {
  const access = await requireStaffAccess();

  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!title || !content) throw new Error('Title and content are required');

  await db.orm.public.SavedReply.create({ title, content, createdByStaffId: access.staffId });

  revalidatePath('/staff/saved-replies');
}

export async function deleteSavedReplyAction(formData: FormData) {
  await requireStaffAccess();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Missing saved reply');

  await db.orm.public.SavedReply.where({ id }).delete();

  revalidatePath('/staff/saved-replies');
}
