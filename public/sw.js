
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Notification', body: event.data && event.data.text() };
  }
  const title = data.title || 'PlacementBridge';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || (data.url ? { url: data.url } : {}),
    actions: data.actions || [],
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (url) {
    // Only allow http(s) URLs and normalize relative paths against origin
    let targetUrl = null;
    try {
      const parsed = new URL(url, self.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        targetUrl = parsed.href;
      }
    } catch (_) {}

    if (!targetUrl) return;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});
