// /// <reference lib="webworker" />
// // src/sw.ts
// import { clientsClaim } from "workbox-core";
// import { precacheAndRoute } from "workbox-precaching";
// import { initializeApp } from "firebase/app";
// import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any };

// self.skipWaiting();
// clientsClaim();

// // VitePWA injects the precache manifest here
// precacheAndRoute(self.__WB_MANIFEST || []);

// // ---- Firebase Messaging in SW (built by Vite, so envs work) ----
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
//     const title = payload.notification?.title ?? payload.data?.title ?? "New notification";
//     const body  = payload.notification?.body  ?? payload.data?.body  ?? "";
//     const data  = payload.data || {};

//     self.registration.showNotification(title, {
//       body,
//       icon: "/icons/icon-192x192.png",
//       data, // pass-through for click handling
//     });
//   });
// } catch (e) {
//   // Fallback for generic Web Push payloads
//   self.addEventListener("push", (event: PushEvent) => {
//     const data = (() => {
//       try { return event.data?.json() || {}; } catch { return {}; }
//     })();
//     const title = data.title || "New message";
//     const body  = data.body  || "";
//     event.waitUntil(
//       self.registration.showNotification(title, {
//         body,
//         icon: "/icons/icon-192x192.png",
//         data,
//       })
//     );
//   });
// }

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   const url = event.notification.data?.url || "/";
//   event.waitUntil((async () => {
//     const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
//     const existing = all.find((c) => (c as WindowClient).url.includes(url));
//     if (existing && "focus" in existing) return (existing as WindowClient).focus();
//     if (self.clients.openWindow) return self.clients.openWindow(url);
//   })());
// });

/// <reference lib="webworker" />
// src/sw.ts

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any };

self.skipWaiting();
clientsClaim();

// ✅ Precache only what's in __WB_MANIFEST (offline.html is already there)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Optional: enable navigation preload for faster first paint
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await self.registration.navigationPreload?.enable(); } catch {}
  })());
});

// ✅ Network-first for navigations; online wins
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);

// ✅ Show offline.html only when the navigation fetch actually fails
setCatchHandler(async ({ request }) => {
  if (request?.mode === 'navigate') {
    const offline = await caches.match('/offline.html', { ignoreSearch: true });
    return offline || new Response('Offline', { status: 503 });
  }
  return Response.error();
});

// ----------------- Firebase Messaging -----------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
      // make sure this path exists in /public; if not, switch to '/datingapp_icon.png'
      icon: '/icons/icon-192x192.png',
      data,
    });
  });
} catch {
  // Fallback for generic Web Push payloads
  self.addEventListener('push', (event: PushEvent) => {
    const data = (() => { try { return event.data?.json() || {}; } catch { return {}; } })();
    const title = (data as any).title || 'New message';
    const body  = (data as any).body  || '';
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        data,
      })
    );
  });
}

// Focus/open on notification click
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
