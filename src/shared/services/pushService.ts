// src/shared/services/pushService.ts
import { messaging, database } from "../utils/firebase";
import { getToken } from "firebase/messaging";
import { ref, set } from "firebase/database";

export async function registerPushTokenForUser(uid: string) {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (!token) return null;

    // Save token in Realtime DB under /usertokens/{uid}/{token} = true
    await set(ref(database, `usertokens/${uid}/${token}`), {
      createdAt: { ".sv": "timestamp" },
    });
    return token;
  } catch (err) {
    console.error("registerPushTokenForUser error", err);
    return null;
  }
}
