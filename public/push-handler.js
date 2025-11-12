const FALLBACK_ICON = '/tahcomlogo.png';
const FALLBACK_URL = '/login';

/**
 * Parse the incoming push payload safely.
 */
function parsePushData(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch (error) {
    console.warn('[PWA][push-handler] Failed to parse push payload', error);
    return {
      title: 'Tahcom Portal',
      body: event.data.text(),
    };
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushData(event);

  const title = payload.title || 'Tahcom Portal';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || FALLBACK_ICON,
    badge: payload.badge || FALLBACK_ICON,
    data: {
      url: payload.url || FALLBACK_URL,
      meta: payload.data || null,
    },
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
    actions: payload.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || FALLBACK_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const matchingClient = clientsArr.find((client) => {
        try {
          return client.url.includes(new URL(targetUrl, self.location.origin).pathname);
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        matchingClient.focus();
        return;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});


