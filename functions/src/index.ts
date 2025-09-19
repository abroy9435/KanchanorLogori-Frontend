// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */



// // functions/src/index.ts
// import { initializeApp } from "firebase-admin/app";
// import { setGlobalOptions } from "firebase-functions/v2/options";
// import { HttpsError } from "firebase-functions/v2/https";
// import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

// initializeApp();

// // Optional global settings
// setGlobalOptions({ maxInstances: 10 /*, region: "asia-south1" */ });

// const ALLOWED_DOMAIN = "tezu.ac.in";

// function assertAllowedEmail(email?: string | null) {
//   const e = (email ?? "").toLowerCase().trim();
//   if (!e.endsWith("@" + ALLOWED_DOMAIN)) {
//     throw new HttpsError(
//       "permission-denied",
//       `Only ${ALLOWED_DOMAIN} accounts can sign in.`
//     );
//   }
// }

// // Runs on account creation
// export const allowTezuOnCreate = beforeUserCreated((event) => {
//   const data = event.data;
//   if (!data) {
//     throw new HttpsError("invalid-argument", "Missing auth event data.");
//   }
//   assertAllowedEmail(data.email);
// });

// // Runs on every sign-in
// export const allowTezuOnSignIn = beforeUserSignedIn((event) => {
//   const data = event.data;
//   if (!data) {
//     throw new HttpsError("invalid-argument", "Missing auth event data.");
//   }

//   assertAllowedEmail(data.email);

//   // Require verified email (optional)
//   if (!data.emailVerified) {
//     throw new HttpsError("failed-precondition", "Verify your university email first.");
//   }

//   // Add optional session claims
//   return { sessionClaims: { campus: "tezu" } };
// });



// functions/src/index.ts
import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { HttpsError, onRequest } from "firebase-functions/v2/https";
import {
  beforeUserCreated,
  beforeUserSignedIn,
} from "firebase-functions/v2/identity";
import type { Request, Response } from "express";

initializeApp();
setGlobalOptions({ maxInstances: 10 /*, region: "asia-south1" */ });

// ---------------------------
// Identity domain guard
// ---------------------------
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

export const allowTezuOnCreate = beforeUserCreated((event) => {
  const data = event.data;
  if (!data) throw new HttpsError("invalid-argument", "Missing auth event data.");
  assertAllowedEmail(data.email);
});

export const allowTezuOnSignIn = beforeUserSignedIn((event) => {
  const data = event.data;
  if (!data) throw new HttpsError("invalid-argument", "Missing auth event data.");
  assertAllowedEmail(data.email);
  if (!data.emailVerified) {
    throw new HttpsError("failed-precondition", "Verify your university email first.");
  }
  return { sessionClaims: { campus: "tezu" } };
});

// ---------------------------
// CORS helper for HTTPS endpoints
// ---------------------------

const EXTRA_ORIGINS = (process.env.ALLOWED_EXTRA_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  // Local dev
  if (origin === "http://localhost:5173") return true;

  // Prod pages root
  if (origin === "https://kanchanorlogori-tu-dating.pages.dev") return true;

  // Preview pages: https://<branch>.<project>.pages.dev
  if (/^https:\/\/[\w-]+\.kanchanorlogori-tu-dating\.pages\.dev$/.test(origin)) return true;

  // Any extra/custom domains via env
  if (EXTRA_ORIGINS.includes(origin)) return true;

  return false;
}

function applyCors(req: Request, res: Response): boolean {
  const origin = (req.headers.origin as string) || "";

  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      // include common headers some mobile browsers/extensions add
      "Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
  }

  // Handle preflight quickly
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

const withCors =
  (handler: (req: Request, res: Response) => void | Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    if (applyCors(req, res)) return;
    await handler(req, res);
  };

// ---------------------------
// Example HTTPS endpoints (swap for your real ones)
// ---------------------------

export const ping = onRequest({ cors: false }, withCors(async (_req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
}));

export const updateUserProfile = onRequest(
  { cors: false },
  withCors(async (req, res) => {
    if (req.method !== "PUT") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }
    const body = req.body ?? {};
    // TODO: auth/validation/persistence
    res.status(200).json({ updated: Object.keys(body) });
  })
);

export const options = onRequest(
  { cors: false },
  withCors(async (_req, res) => {
    // TODO: return real lists from your DB if needed
    res.status(200).json({
      departments: ["CSE", "ECE", "ME"],
      schools: ["School A", "School B"],
      programmes: ["B.Tech", "M.Tech"],
    });
  })
);
