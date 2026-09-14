'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';

export async function toggleChecklistItemAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const itemKey = String(formData.get('itemKey') ?? '').trim();
  if (!itemKey) throw new Error('Missing item');

  const existing = await db.orm.public.MoveInChecklistItem.where({
    tenantId: session.tenantId,
    itemKey,
  }).first();

  if (existing) {
    await db.orm.public.MoveInChecklistItem.where({ id: existing.id }).delete();
  } else {
    await db.orm.public.MoveInChecklistItem.create({ tenantId: session.tenantId, itemKey });
  }

  revalidatePath('/move-in-guide');
}
