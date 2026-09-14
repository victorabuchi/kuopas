'use client';

import { useEffect } from 'react';
import { savePushSubscriptionAction } from '../../lib/push-actions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Subscribes the tenant to Web Push the first time they land on an
// authenticated page, so a new building post can reach them even when the
// app isn't open. Silently does nothing if the browser doesn't support it,
// permission was denied, or a subscription already exists.
export default function PushSubscribe() {
  useEffect(() => {
    const publicKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
    if (!publicKey) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    let cancelled = false;

    (async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');

      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted' || cancelled) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await savePushSubscriptionAction({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
    })().catch((error) => console.error('Push subscription failed:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
