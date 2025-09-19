// src/shared/api.ts
import axios from "axios";
import { auth } from "./utils/firebase";

import type { 
  UserProfileOnSend, 
  UserProfileOnReceive, 
  UserPost 
} from "./types";
import type{ 
  SearchQuery, 
  UserProfileOnSearchResponse, 
  Department, 
  School, 
  Programme, 
  SetLikes, 
  SetBlock, 
  SetUnblock 
} from "./apitypes";

import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// --------------------
// Axios instance
// --------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  // IMPORTANT: don't set default Content-Type; axios will set it per request.
});

// Attach Firebase token on every request
api.interceptors.request.use(async (cfg) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Normalize profile field naming
function normalizeProfile(profile: any): UserProfileOnReceive {
  return {
    ...profile,
    dateOfBirth: profile.dateOfBirth || profile.dateofbirth || null,
  };
}

// --------------------
// API
// --------------------
export const registerUser = (data: UserProfileOnSend) => api.post("/user/register", data);
export const updateUser = (data: UserProfileOnSend) => api.post("/user/update", data);

export async function getMyProfile(): Promise<UserProfileOnReceive> {
  const res = await api.get("/user/profile");
  return normalizeProfile(res.data);
}

export const searchUser = (q: SearchQuery) =>
  api.post<UserProfileOnSearchResponse[]>("/user/search", q);

export const getDepartments = () => api.get<Department[]>("/meta/departments").then((r) => r.data);
export const getSchools = () => api.get<School[]>("/meta/schools").then((r) => r.data);
export const getProgrammes = () => api.get<Programme[]>("/meta/programmes").then((r) => r.data);

export const setLike = (body: SetLikes) => api.post("/relation/set", body);
export const setBlock = (body: SetBlock) => api.post("/relation/set", body);
export const setUnblock = (body: SetUnblock) => api.post("/relation/set", body);

export const uploadPost = (file: File, caption: string) => {
  const formData = new FormData();
  formData.append("picture", file);
  formData.append("caption", caption);
  return api.post("/posts/upload", formData);
};

export const getPosts = (target?: string) =>
  api.get<UserPost[]>("/posts/all", { params: { target } });

export const getRandomProfiles = () =>
  api.post<UserProfileOnReceive[]>("/discover/random").then((r) => r.data);

// ---- Avatar upload: only `file`, backend returns { avatar_url, message } ----
export async function uploadAvatar(file: File): Promise<{ avatar_url?: string; message?: string }> {
  const fd = new FormData();
  fd.append("file", file, file.name); // backend expects part name "file"
  const res = await api.put("/user/profile/update", fd, {
    // no headers.Content-Type here: axios sets multipart boundary automatically
  });
  // backend may return Unit/empty OR { avatar_url, message }
  return (res.data ?? {}) as { avatar_url?: string; message?: string };
}

export default api;

// --------------------
// REPORT (unchanged)
// --------------------
export type ReportReason = "Cyberbullying or abuse" | "Spam or misleading content" | "Other";

export async function submitUserReport(opts: {
  reportedUid: string;
  reportedName: string;
  reportedEmail?: string | null;
  reason: ReportReason;
  details?: string;
}) {
  const db = getFirestore();
  const reporterUid = auth.currentUser?.uid ?? "anonymous";
  const details = (opts.details ?? "").trim();

  const reportBlob =
    `Profile: ${opts.reportedName}, ${opts.reportedUid}` +
    `${opts.reportedEmail ? `, ${opts.reportedEmail}` : ""} ` +
    `details:${opts.reason}${details ? `, ${details}` : ""}`;

  const payload = {
    report: reportBlob,
    time: serverTimestamp(),
    uid: reporterUid,
    reported_uid: opts.reportedUid,
    reported_name: opts.reportedName,
    reported_email: opts.reportedEmail ?? null,
    reason: opts.reason,
    details,
    source: "pwa",
  };

  await addDoc(collection(db, "reports_user"), payload);
}

// // src/shared/api.ts
// import axios from "axios";
// import { auth } from "./utils/firebase";
// import type { 
//   UserProfileOnSend, 
//   UserProfileOnReceive, 
//   UserProfileToShow, 
//   UserPost 
// } from "./types";
// import type{ 
//   SearchQuery, 
//   UserProfileOnSearchResponse, 
//   ProfileQuery, 
//   Department, 
//   School, 
//   Programme, 
//   SetLikes, 
//   SetBlock, 
//   SetUnblock 
// } from "./apitypes";
// // --- Firestore for user reports ---
// import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// // --------------------
// // Axios instance
// // --------------------
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
//   headers: { "Content-Type": "application/json" },
// });

// function normalizeProfile(profile: any): UserProfileOnReceive {
//   return {
//     ...profile,
//     dateOfBirth: profile.dateOfBirth || profile.dateofbirth || null,
//   };
// }




// // attach firebase token
// /*
// api.interceptors.request.use(async (cfg) => {
//   const token = await auth.currentUser?.getIdToken();
//   if (token && cfg.headers) {
//     cfg.headers["Authorization"] = `Bearer ${token}`;
//   }
//   return cfg;
// });
// */
// api.interceptors.request.use(async (cfg) => {
//   if (auth.currentUser) {
//     const token = await auth.currentUser.getIdToken();
    
//     if (cfg.headers) {
//       cfg.headers.Authorization = `Bearer ${token}`;
//     }
//   }
//   return cfg;
// });

// // --------------------
// // AUTH / USER PROFILE
// // --------------------
// export const registerUser = (data: UserProfileOnSend) =>
//   api.post("/user/register", data);

// export const updateUser = (data: UserProfileOnSend) =>
//   api.post("/user/update", data);

// // export const getProfile = (q: ProfileQuery) =>
// //   api.post<UserProfileToShow>("/user/profile", q);

// export const getUser = () =>
//   api.get<UserProfileOnReceive>("/user/get");

// // Fetch the current logged-in user's profile
// // export const getMyProfile = () =>
// //   api.get<UserProfileOnReceive>("/user/profile").then(r => r.data);

//   export async function getMyProfile(): Promise<UserProfileOnReceive> {
//     const res = await api.get("/user/profile");
//     return normalizeProfile(res.data);
//   }

// // --------------------
// // SEARCH
// // --------------------
// export const searchUser = (q: SearchQuery) =>
//   api.post<UserProfileOnSearchResponse[]>("/user/search", q);

// // --------------------
// // METADATA (dropdowns)
// // --------------------
// export const getDepartments = () =>
//   api.get<Department[]>("/meta/departments").then(r => r.data);

// export const getSchools = () =>
//   api.get<School[]>("/meta/schools").then(r => r.data);

// export const getProgrammes = () =>
//   api.get<Programme[]>("/meta/programmes").then(r => r.data);

// // --------------------
// // RELATIONS
// // --------------------
// export const setLike = (body: SetLikes) =>
//   api.post("/relation/set", body);

// export const setBlock = (body: SetBlock) =>
//   api.post("/relation/set", body);

// export const setUnblock = (body: SetUnblock) =>
//   api.post("/relation/set", body);

// // --------------------
// // POSTS
// // --------------------
// export const uploadPost = (file: File, caption: string) => {
//   const formData = new FormData();
//   formData.append("picture", file);
//   formData.append("caption", caption);
//   return api.post("/posts/upload", formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
// };

// export const getPosts = (target?: string) =>
//   api.get<UserPost[]>("/posts/all", { params: { target } });

// export default api;


// // --------------------
// // FEED
// // --------------------
// export const getRandomProfiles = () =>
//   api.post<UserProfileOnReceive[]>("/discover/random").then(r => r.data);


// // --------------------
// // UPDATE PROFILE
// // --------------------
//   export const updateProfilePic = (formData: FormData) =>
//   api.put("/user/profile/update", formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });

// // --------------------
// // REPORTS (Firestore)
// // --------------------
// export type ReportReason =
//   | "Cyberbullying or abuse"
//   | "Spam or misleading content"
//   | "Other";

// /**
//  * Writes a user report to Firestore -> collection `reports_user`.
//  * Mirrors your console example: fields `report`, `time`, `uid`,
//  * plus a few harmless structured fields for moderation.
//  */
// export async function submitUserReport(opts: {
//   reportedUid: string;
//   reportedName: string;
//   reportedEmail?: string | null;
//   reason: ReportReason;
//   details?: string;
// }) {
//   const db = getFirestore();
//   const reporterUid = auth.currentUser?.uid ?? "anonymous";

//   const details = (opts.details ?? "").trim();

//   // Match the compact "report" blob from your screenshot
//   const reportBlob =
//     `Profile: ${opts.reportedName}, ${opts.reportedUid}` +
//     `${opts.reportedEmail ? `, ${opts.reportedEmail}` : ""} ` +
//     `details:${opts.reason}${details ? `, ${details}` : ""}`;

//   const payload = {
//     report: reportBlob,                 // ← matches your sample
//     time: serverTimestamp(),            // ← Firestore server time
//     uid: reporterUid,                   // ← reporter uid
//     // extra structured fields (optional, helpful later)
//     reported_uid: opts.reportedUid,
//     reported_name: opts.reportedName,
//     reported_email: opts.reportedEmail ?? null,
//     reason: opts.reason,
//     details,
//     source: "pwa",
//   };

//   await addDoc(collection(db, "reports_user"), payload);
// }