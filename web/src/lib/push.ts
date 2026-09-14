import webpush from 'web-push';
import { db } from '../prisma/db';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env['VAPID_PUBLIC_KEY'];
  const privateKey = process.env['VAPID_PRIVATE_KEY'];
  const subject = process.env['VAPID_SUBJECT'];
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys are not configured');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

type PushPayload = { title: string; body: string; url?: string };

async function sendToSubscription(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  try {
    ensureConfigured();
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription is gone (browser data cleared, uninstalled, etc).
      await db.orm.public.PushSubscription.where({ id: subscription.id }).delete();
    } else {
      console.error('Push send failed:', error);
    }
  }
}

// Notifies every tenant who belongs to this building's chat group (i.e.
// everyone who lives there) of a new announcement or noticeboard post.
export async function sendPushToBuilding(buildingId: string, payload: PushPayload) {
  const buildingGroup = await db.orm.public.ChatGroup.where({ buildingId }).first();
  if (!buildingGroup) return;

  const members = await db.orm.public.ChatGroupMember.where({ chatGroupId: buildingGroup.id }).all();
  const tenantIds = members.map((m) => m.tenantId);
  if (tenantIds.length === 0) return;

  const subscriptions = await db.orm.public.PushSubscription.where((s) => s.tenantId.in(tenantIds)).all();
  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload) {
  const subscriptions = await db.orm.public.PushSubscription.where({ tenantId }).all();
  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));
}
