/// <reference lib="webworker" />
// src/sw.ts
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any };

self.skipWaiting();
clientsClaim();

// VitePWA injects the precache manifest here
precacheAndRoute(self.__WB_MANIFEST || []);

// ---- Firebase Messaging in SW (built by Vite, so envs work) ----
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
    const title = payload.notification?.title ?? payload.data?.title ?? "New notification";
    const body  = payload.notification?.body  ?? payload.data?.body  ?? "";
    const data  = payload.data || {};

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      data, // pass-through for click handling
    });
  });
} catch (e) {
  // Fallback for generic Web Push payloads
  self.addEventListener("push", (event: PushEvent) => {
    const data = (() => {
      try { return event.data?.json() || {}; } catch { return {}; }
    })();
    const title = data.title || "New message";
    const body  = data.body  || "";
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        data,
      })
    );
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find((c) => (c as WindowClient).url.includes(url));
    if (existing && "focus" in existing) return (existing as WindowClient).focus();
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
