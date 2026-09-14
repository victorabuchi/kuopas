'use server';

import { db } from '../prisma/db';
import { getSession } from './session';

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in');

  const existing = await db.orm.public.PushSubscription.where({ endpoint: input.endpoint }).first();
  if (existing) {
    await db.orm.public.PushSubscription.where({ id: existing.id }).update({
      tenantId: session.tenantId,
      p256dh: input.p256dh,
      auth: input.auth,
    });
    return;
  }

  await db.orm.public.PushSubscription.create({
    tenantId: session.tenantId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  });
}

export async function deletePushSubscriptionAction(endpoint: string) {
  const existing = await db.orm.public.PushSubscription.where({ endpoint }).first();
  if (existing) {
    await db.orm.public.PushSubscription.where({ id: existing.id }).delete();
  }
}
