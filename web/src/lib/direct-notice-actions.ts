'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../prisma/db';
import { getSession } from './session';
import { requireStaffAccess } from './portal-access';
import { sendPushToTenant } from './push';

async function getOrCreateThread(tenantId: string) {
  const existing = await db.orm.public.DirectNoticeThread.where({ tenantId }).first();
  if (existing) return existing;
  return db.orm.public.DirectNoticeThread.create({ tenantId });
}

// Staff picks a student and writes to them directly.
export async function sendDirectNoticeAction(formData: FormData) {
  const access = await requireStaffAccess();

  const tenantId = String(formData.get('tenantId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!tenantId || !content) throw new Error('Recipient and message content are required');

  const thread = await getOrCreateThread(tenantId);
  await db.orm.public.DirectNoticeMessage.create({
    threadId: thread.id,
    senderStaffId: access.staffId,
    content,
  });

  await sendPushToTenant(tenantId, { title: 'Message from Kuopas', body: content, url: '/messages' });

  revalidatePath('/messages');
  revalidatePath('/staff/notices');
}

// Rent reminder, v1: a manual broadcast to every tenant's own notice thread,
// styled the same as a direct notice. Wiring this to the real billing
// system is a later step; for now it's "rent is due the 5th," sent by hand.
export async function sendRentReminderAction(formData: FormData) {
  const access = await requireStaffAccess();

  const content = String(formData.get('content') ?? '').trim();
  if (!content) throw new Error('Message content is required');

  const tenants = await db.orm.public.Tenant.all();

  for (const tenant of tenants) {
    const thread = await getOrCreateThread(tenant.id);
    await db.orm.public.DirectNoticeMessage.create({
      threadId: thread.id,
      senderStaffId: access.staffId,
      content,
    });
    await sendPushToTenant(tenant.id, { title: 'Rent reminder', body: content, url: '/messages' });
  }

  revalidatePath('/messages');
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

  revalidatePath('/messages');
  revalidatePath(`/staff/notices/${session.tenantId}`);
}
