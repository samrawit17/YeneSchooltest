// Force immediate activation - no waiting for old SW to die
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();

      // Notify all open client windows so the UI updates instantly
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          clientList[i].postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: data,
          });
        }
      });

      const options = {
        body: data.body,
        icon: data.icon || '/avatar.svg',
        badge: data.badge || '/avatar.svg',
        vibrate: data.type === 'SIREN_ALERT' ? [300, 150, 300, 150, 300] : [100, 50, 100],
        requireInteraction: data.type === 'SIREN_ALERT',
        data: {
          dateOfArrival: Date.now(),
          url: data.url || '/',
          type: data.type || 'INFO',
        },
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
      );
    } catch (e) {
      console.error('Error parsing push notification data:', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
