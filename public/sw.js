/* RoomieKhata service worker — background push + notification click handling.
 * Works with FCM web push (data-only messages) and with locally triggered notifications. */

const ICON = '/images/icon.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch (e) {
    try {
      return { data: { body: event.data.text() } };
    } catch (e2) {
      return {};
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const n = payload.notification || {};
  const d = payload.data || {};

  const title = n.title || d.title || 'RoomieKhata';
  const body = n.body || d.body || '';
  const url = d.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: n.icon || d.icon || ICON,
      badge: ICON,
      tag: d.tag || undefined, // same tag → replaces instead of stacking duplicates
      renotify: !!d.tag,
      vibrate: [120, 60, 120],
      // settlement approvals stay on screen until the receiver acts on them
      requireInteraction: d.type === 'settlement_request',
      data: { url, type: d.type || '' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL(raw, self.location.origin);
  const tab = target.searchParams.get('tab');

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: 'NAVIGATE', tab });
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
