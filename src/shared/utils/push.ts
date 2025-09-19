// src/shared/utils/push.ts
import { isSupported, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { messaging } from "./firebase";

/**
 * Initialize FCM (requires Notification permission GRANTED).
 * Returns the FCM token or null if unsupported/unavailable.
 */
export async function initPush(): Promise<string | null> {
  // SW must be ready and messaging must exist
  const supported = await isSupported().catch(() => false);
  if (!supported || !messaging) return null;

  // If the site doesn’t have permission, do nothing.
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  // Make sure our PWA service worker is active
  const reg = await navigator.serviceWorker.ready;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    console.warn("[FCM] Missing VITE_FIREBASE_VAPID_KEY");
    return null;
  }

  // Get token (throws if permission is blocked or in Incognito)
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: reg,
  });

  // Foreground messages
  onMessage(messaging, (payload: MessagePayload) => {
    console.log("[FCM] foreground message:", payload);
    // TODO: show a toast or badge if you want
  });

  return token;
}

/**
 * Ask for permission (must be triggered by a user gesture),
 * then initialize FCM if granted.
 */
export async function requestPermissionAndInit(): Promise<string | null> {
  if (!("Notification" in window)) return null;

  // If the user already granted, just init
  if (Notification.permission === "granted") {
    return initPush();
  }

  // If previously blocked, the browser returns "denied" immediately
  const result = await Notification.requestPermission();
  if (result !== "granted") {
    // result is "denied" or "default"
    return null;
  }
  return initPush();
}
