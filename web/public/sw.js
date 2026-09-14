self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Kuopas', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Kuopas', {
      body: payload.body,
      icon: '/Kuopas-logo.png',
      badge: '/Kuopas-logo.png',
      data: { url: payload.url || '/feed' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/feed';
  event.waitUntil(clients.openWindow(url));
});
