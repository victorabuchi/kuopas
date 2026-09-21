'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaffAccess } from './portal-access';
import { setSetting } from './settings';

export async function saveSplitterSettingsAction(formData: FormData) {
  const access = await requireStaffAccess();
  if (!access.isAdmin) throw new Error('Only an admin can do this');

  const mode = String(formData.get('mode') ?? '') === 'all' ? 'all' : 'micro';
  const euros = Number(String(formData.get('limit') ?? '').replace(',', '.'));
  const cents = Math.round(euros * 100);
  await setSetting('splitter.mode', mode);
  if (Number.isFinite(cents) && cents >= 100 && cents <= 1_000_000) await setSetting('splitter.microLimitCents', String(cents));

  revalidatePath('/household');
  revalidatePath('/admin/settings');
  redirect('/admin/settings?saved=1');
}
