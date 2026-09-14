'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { getStaffSession } from './staff-session';
import { sendPushToTenant } from './push';

async function getOrCreateThread(tenantId: string) {
  const existing = await db.orm.public.DirectNoticeThread.where({ tenantId }).first();
  if (existing) return existing;
  return db.orm.public.DirectNoticeThread.create({ tenantId });
}

// Staff picks a student and writes to them directly.
export async function sendDirectNoticeAction(formData: FormData) {
  const staffSession = await getStaffSession();
  if (!staffSession) throw new Error('Not signed in as staff');

  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!tenantId || !content) throw new Error('Recipient and message content are required');

  const thread = await getOrCreateThread(tenantId);
  await db.orm.public.DirectNoticeMessage.create({
    threadId: thread.id,
    senderStaffId: staffSession.staffId,
    content,
  });

  await sendPushToTenant(tenantId, { title: 'Message from Kuopas', body: content, url: '/notices' });

  revalidatePath('/notices');
  revalidatePath('/staff/notices');
}

// The resident's reply in their own direct-notice thread.
export async function replyToNoticeAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const content = String(formData.get('content') ?? '').trim();
  if (!content) throw new Error('Message content is required');

  const thread = await getOrCreateThread(session.tenantId);
  await db.orm.public.DirectNoticeMessage.create({
    threadId: thread.id,
    senderTenantId: session.tenantId,
    content,
  });

  revalidatePath('/notices');
  revalidatePath(`/staff/notices/${session.tenantId}`);
}
