const CACHE_NAME = 'sms-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/sign-in',
  '/offline',
  '/manifest.json',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }

      return fetch(event.request).then(function (fetchResponse) {
        if (fetchResponse && fetchResponse.status === 200) {
          var responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      var data = event.data.json();

      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          clientList[i].postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: data,
          });
        }
      });

      var isImportantAlert = data.type === 'SIREN_ALERT' || data.type === 'ATTENDANCE_ABSENT';
      var options = {
        body: data.body,
        icon: data.icon || '/avatar.svg',
        badge: data.badge || '/avatar.svg',
        vibrate: data.type === 'SIREN_ALERT' ? [300, 150, 300, 150, 300] : [100, 50, 100],
        requireInteraction: isImportantAlert,
        data: {
          dateOfArrival: Date.now(),
          url: data.url && typeof data.url === 'string' ? data.url : '/',
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
  var targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/notifications';

  if (targetUrl.startsWith('/')) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    );
  }
});
