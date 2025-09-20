
// /// <reference lib="webworker" />
// // src/sw.ts

// import { clientsClaim } from 'workbox-core';
// import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
// import { registerRoute, setCatchHandler } from 'workbox-routing';
// import { NetworkFirst } from 'workbox-strategies';

// import { initializeApp } from 'firebase/app';
// import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any };

// self.skipWaiting();
// clientsClaim();

// // ✅ Precache only what's in __WB_MANIFEST (offline.html is already there)
// precacheAndRoute(self.__WB_MANIFEST || []);
// cleanupOutdatedCaches();

// // Optional: enable navigation preload for faster first paint
// self.addEventListener('activate', (event) => {
//   event.waitUntil((async () => {
//     try { await self.registration.navigationPreload?.enable(); } catch {}
//   })());
// });

// // ✅ Network-first for navigations; online wins
// registerRoute(
//   ({ request }) => request.mode === 'navigate',
//   new NetworkFirst({ cacheName: 'pages' })
// );

// // ✅ Show offline.html only when the navigation fetch actually fails
// setCatchHandler(async ({ request }) => {
//   if (request?.mode === 'navigate') {
//     const offline = await caches.match('/offline.html', { ignoreSearch: true });
//     return offline || new Response('Offline', { status: 503 });
//   }
//   return Response.error();
// });

// // ----------------- Firebase Messaging -----------------
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// try {
//   const app = initializeApp(firebaseConfig);
//   const messaging = getMessaging(app);

//   onBackgroundMessage(messaging, (payload) => {
//     const title = payload.notification?.title ?? payload.data?.title ?? 'New notification';
//     const body  = payload.notification?.body  ?? payload.data?.body  ?? '';
//     const data  = payload.data || {};
//     self.registration.showNotification(title, {
//       body,
//       // make sure this path exists in /public; if not, switch to '/datingapp_icon.png'
//       icon: '/datingapp_icon.png',
//       data,
//     });
//   });
// } catch {
//   // Fallback for generic Web Push payloads
//   self.addEventListener('push', (event: PushEvent) => {
//     const data = (() => { try { return event.data?.json() || {}; } catch { return {}; } })();
//     const title = (data as any).title || 'New message';
//     const body  = (data as any).body  || '';
//     event.waitUntil(
//       self.registration.showNotification(title, {
//         body,
//         icon: '/datingapp_icon.png',
//         data,
//       })
//     );
//   });
// }

// // Focus/open on notification click
// self.addEventListener('notificationclick', (event: NotificationEvent) => {
//   event.notification.close();
//   const url = (event.notification.data as any)?.url || '/';
//   event.waitUntil((async () => {
//     const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
//     const existing = all.find((c) => (c as WindowClient).url.includes(url));
//     if (existing && 'focus' in existing) return (existing as WindowClient).focus();
//     return self.clients.openWindow?.(url);
//   })());
// });
/// <reference lib="webworker" />
// src/sw.ts

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any };

self.skipWaiting();
clientsClaim();

// --------- Precache build assets ----------
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Enable navigation preload (faster first paint)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await self.registration.navigationPreload?.enable(); } catch {}
  })());
});

// Allow app to clear runtime caches (e.g., on logout)
self.addEventListener('message', (event: any) => {
  if (event?.data?.type === 'CLEAR_API_CACHE') {
    event.waitUntil(Promise.all([
      caches.delete('api'),
      caches.delete('meta'),
      // optionally clear others:
      // caches.delete('images'),
      // caches.delete('pages'),
    ]));
  }
});

// =====================
// RUNTIME CACHING
// =====================

// Detect your API origin from env (e.g. https://…hf.space)
const API_ORIGIN = (() => {
  try {
    const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined;
    return raw ? new URL(raw).origin : null;
  } catch { return null; }
})();

// 1) SPA navigations → NetworkFirst (fresh when online, fallback to cache)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 }) // 1h
    ]
  })
);

// 2) API GETs (non-meta) → NetworkFirst (5 min cache)
registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') return false;
    if (API_ORIGIN && url.origin === API_ORIGIN) return true;
    // also catch same-origin /api/* if proxied locally
    return url.pathname.startsWith('/api/');
  },
  new NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }) // 5 min
    ]
  })
);

// 3) Meta/lookup endpoints (change rarely) → SWR (1 day)
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    (API_ORIGIN && url.origin === API_ORIGIN && url.pathname.startsWith('/api')) &&
    url.pathname.includes('/meta/'),
  new StaleWhileRevalidate({
    cacheName: 'meta',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }) // 1 day
    ]
  })
);

// 4) Queue writes (POST/PUT/PATCH/DELETE) while offline → Background Sync
const writeQueue = new BackgroundSyncPlugin('api-writes', {
  maxRetentionTime: 24 * 60, // minutes
});
const matchesApi = ({ url }: { url: URL }) =>
  (API_ORIGIN && url.origin === API_ORIGIN) || url.pathname.startsWith('/api/');

['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
  registerRoute(
    ({ url, request }) => request.method === method && matchesApi({ url }),
    new NetworkOnly({ plugins: [writeQueue] }),
    method as any
  );
});

// 5) Images/avatars → SWR (7 days)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    url.pathname.startsWith('/avatars/') ||
    (API_ORIGIN && url.origin === API_ORIGIN && url.pathname.startsWith('/avatars/')),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 }) // 7 days
    ]
  })
);

// 6) Google Fonts → CacheFirst (1 year)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 365 * 24 * 60 * 60 })
    ]
  })
);

// ---------- Offline fallbacks ----------
setCatchHandler(async ({ request }) => {
  // Navigations → offline page
  if (request?.mode === 'navigate') {
    const offline = await caches.match('/offline.html', { ignoreSearch: true });
    return offline || new Response('Offline', { status: 503 });
  }
  // Image fallback (e.g., avatars)
  if (request?.destination === 'image') {
    const ph = await caches.match('/profile_placeholder.jpg', { ignoreSearch: true });
    if (ph) return ph;
  }
  return Response.error();
});

// =====================
// Firebase Messaging
// =====================
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? payload.data?.title ?? 'New notification';
    const body  = payload.notification?.body  ?? payload.data?.body  ?? '';
    const data  = payload.data || {};
    self.registration.showNotification(title, {
      body,
      icon: '/datingapp_icon.png', // ensure this exists in /public
      data,
    });
  });
} catch {
  self.addEventListener('push', (event: PushEvent) => {
    const data = (() => { try { return event.data?.json() || {}; } catch { return {}; } })();
    const title = (data as any).title || 'New message';
    const body  = (data as any).body  || '';
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/datingapp_icon.png',
        data,
      })
    );
  });
}

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as any)?.url || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find((c) => (c as WindowClient).url.includes(url));
    if (existing && 'focus' in existing) return (existing as WindowClient).focus();
    return self.clients.openWindow?.(url);
  })());
});
