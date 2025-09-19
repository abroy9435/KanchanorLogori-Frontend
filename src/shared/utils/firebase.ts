// // Import the functions you need from the SDKs you need
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import { getDatabase } from "firebase/database";
// import { getMessaging } from "firebase/messaging";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   databaseURL: import.meta.env.VITE_FIREBASE_database_URL,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_mesurement_ID
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// // Initialize Firebase Authentication
// const auth = getAuth(app);
// const provider = new GoogleAuthProvider();
// provider.setCustomParameters({ hd: "tezu.ac.in" }); 

// //Realtime DB
// export const database = getDatabase(app);

// // Messaging (wrap in try-catch for browsers that don’t support)
// export const messaging = (() => {
//   try {
//     return getMessaging(app);
//   } catch (e) {
//     console.warn("Messaging not supported in this environment", e);
//     return null as any;
//   }
// })();

// export { auth, provider, app };
// src/shared/utils/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getMessaging, isSupported as messagingSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_database_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_mesurement_ID,
};

const app = initializeApp(firebaseConfig);

// Analytics (only if supported)
(async () => {
  try {
    if (await analyticsSupported()) getAnalytics(app);
  } catch {}
})();

// Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: "tezu.ac.in" });

// Realtime DB
const database = getDatabase(app);

/**
 * Messaging: export a value that always exists at import time.
 * If the environment doesn’t support FCM, this will be `null`.
 */
export const messaging: Messaging | null = (() => {
  try {
    // If not supported, this throws in some environments; we guard with isSupported().
    // Note: isSupported() is async, but getMessaging() will still succeed on browsers that support it.
    // For stricter checks, you can gate with isSupported() before using `messaging`.
    return getMessaging(app);
  } catch (e) {
    console.warn("Messaging not supported in this environment", e);
    return null;
  }
})();

export { app, auth, provider, database };
