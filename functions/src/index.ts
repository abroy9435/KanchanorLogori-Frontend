// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

// import {setGlobalOptions} from "firebase-functions";
// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";


// setGlobalOptions({ maxInstances: 10 });

// import { initializeApp } from "firebase-admin/app";
// import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
// import { HttpsError } from "firebase-functions/v2/https";

// initializeApp();

// const ALLOWED_DOMAIN = "tezu.ac.in";

// function assertAllowedEmail(email?: string | null) {
//   const e = (email || "").toLowerCase().trim();
//   if (!e.endsWith("@" + ALLOWED_DOMAIN)) {
//     // This message is returned to the client—keep it user friendly
//     throw new HttpsError(
//       "permission-denied",
//       `Only ${ALLOWED_DOMAIN} accounts can sign in.`
//     );
//   }
// }

// /**
//  * Block non-tezu accounts at SIGN UP.
//  * Runs for Google sign-in and any other provider that supplies email.
//  */
// export const allowTezuOnCreate = beforeUserCreated((event) => {
//   assertAllowedEmail(event.data.email);
// });

// /**
//  * Block non-tezu accounts at SIGN IN (covers existing users too).
//  * Also a nice spot to enforce email verification if you want.
//  */
// export const allowTezuOnSignIn = beforeUserSignedIn((event) => {
//   assertAllowedEmail(event.data.email);

//   // Optional: require verified email
//   if (!event.data.emailVerified) {
//     throw new HttpsError("failed-precondition", "Verify your university email first.");
//   }

//   // Optional: attach session claims for your backend (valid for this session)
//   return {
//     sessionClaims: { campus: "tezu" },
//   };
// });


// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

initializeApp();

// Optional global settings
setGlobalOptions({ maxInstances: 10 /*, region: "asia-south1" */ });

const ALLOWED_DOMAIN = "tezu.ac.in";

function assertAllowedEmail(email?: string | null) {
  const e = (email ?? "").toLowerCase().trim();
  if (!e.endsWith("@" + ALLOWED_DOMAIN)) {
    throw new HttpsError(
      "permission-denied",
      `Only ${ALLOWED_DOMAIN} accounts can sign in.`
    );
  }
}

// Runs on account creation
export const allowTezuOnCreate = beforeUserCreated((event) => {
  const data = event.data;
  if (!data) {
    throw new HttpsError("invalid-argument", "Missing auth event data.");
  }
  assertAllowedEmail(data.email);
});

// Runs on every sign-in
export const allowTezuOnSignIn = beforeUserSignedIn((event) => {
  const data = event.data;
  if (!data) {
    throw new HttpsError("invalid-argument", "Missing auth event data.");
  }

  assertAllowedEmail(data.email);

  // Require verified email (optional)
  if (!data.emailVerified) {
    throw new HttpsError("failed-precondition", "Verify your university email first.");
  }

  // Add optional session claims
  return { sessionClaims: { campus: "tezu" } };
});
