// // src/shared/api.ts
// import axios from "axios";
// import { auth } from "./utils/firebase";

// import type { 
//   UserProfileOnSend, 
//   UserProfileOnReceive, 
//   UserPost 
// } from "./types";
// import type{ 
//   SearchQuery, 
//   UserProfileOnSearchResponse, 
//   Department, 
//   School, 
//   Programme, 
//   SetLikes, 
//   SetBlock, 
//   SetUnblock 
// } from "./apitypes";

// import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// // --------------------
// // Axios instance
// // --------------------
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
//   // IMPORTANT: don't set default Content-Type; axios will set it per request.
// });

// // Ensure FormData isn't converted or given a JSON content-type
// delete api.defaults.headers.post?.["Content-Type"];
// delete api.defaults.headers.put?.["Content-Type"];

// api.defaults.transformRequest = [(data: any, headers: any) => {
//   if (typeof FormData !== "undefined" && data instanceof FormData) {
//     if (headers) {
//       delete headers["Content-Type"]; // let the browser add the multipart boundary
//       delete headers["content-type"];
//     }
//   }
//   return data;
// }];

// // Attach Firebase token on every request
// api.interceptors.request.use(async (cfg) => {
//   if (auth.currentUser) {
//     const token = await auth.currentUser.getIdToken();
//     cfg.headers = cfg.headers || {};
//     cfg.headers.Authorization = `Bearer ${token}`;
//   }
//   return cfg;
// });

// // Normalize profile field naming
// function normalizeProfile(profile: any): UserProfileOnReceive {
//   return {
//     ...profile,
//     dateOfBirth: profile.dateOfBirth || profile.dateofbirth || null,
//   };
// }

// // --------------------
// // API
// // --------------------
// export const registerUser = (data: UserProfileOnSend) => api.post("/user/register", data);
// export const updateUser = (data: UserProfileOnSend) => api.post("/user/update", data);

// export async function getMyProfile(): Promise<UserProfileOnReceive> {
//   const res = await api.get("/user/profile");
//   return normalizeProfile(res.data);
// }

// export const searchUser = (q: SearchQuery) =>
//   api.post<UserProfileOnSearchResponse[]>("/user/search", q);

// export const getDepartments = () => api.get<Department[]>("/meta/departments").then((r) => r.data);
// export const getSchools = () => api.get<School[]>("/meta/schools").then((r) => r.data);
// export const getProgrammes = () => api.get<Programme[]>("/meta/programmes").then((r) => r.data);

// export const setLike = (body: SetLikes) => api.post("/relation/set", body);
// export const setBlock = (body: SetBlock) => api.post("/relation/set", body);
// export const setUnblock = (body: SetUnblock) => api.post("/relation/set", body);

// export const uploadPost = (file: File, caption: string) => {
//   const formData = new FormData();
//   formData.append("picture", file);
//   formData.append("caption", caption);
//   return api.post("/posts/upload", formData);
// };

// export const getPosts = (target?: string) =>
//   api.get<UserPost[]>("/posts/all", { params: { target } });

// export const getRandomProfiles = () =>
//   api.post<UserProfileOnReceive[]>("/discover/random").then((r) => r.data);

// // ---- Avatar upload: only `file`, backend returns { avatar_url, message } ----
// export async function uploadAvatar(file: File): Promise<{ avatar_url?: string; message?: string }> {
//   const fd = new FormData();
//   fd.append("file", file, file.name); // backend expects part name "file"
//   const res = await api.put("/user/profile/update", fd, {
//     // no headers.Content-Type here: axios sets multipart boundary automatically
//   });
//   // backend may return Unit/empty OR { avatar_url, message }
//   return (res.data ?? {}) as { avatar_url?: string; message?: string };
// }

// export default api;

// // --------------------
// // REPORT (unchanged)
// // --------------------
// export type ReportReason = "Cyberbullying or abuse" | "Spam or misleading content" | "Other";

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

//   const reportBlob =
//     `Profile: ${opts.reportedName}, ${opts.reportedUid}` +
//     `${opts.reportedEmail ? `, ${opts.reportedEmail}` : ""} ` +
//     `details:${opts.reason}${details ? `, ${details}` : ""}`;

//   const payload = {
//     report: reportBlob,
//     time: serverTimestamp(),
//     uid: reporterUid,
//     reported_uid: opts.reportedUid,
//     reported_name: opts.reportedName,
//     reported_email: opts.reportedEmail ?? null,
//     reason: opts.reason,
//     details,
//     source: "pwa",
//   };

//   await addDoc(collection(db, "reports_user"), payload);
// }

// src/shared/api.ts
import axios  from "axios";
import type { AxiosRequestConfig } from "axios";
import { auth } from "./utils/firebase";

import type {
  UserProfileOnSend,
  UserProfileOnReceive,
  UserPost
} from "./types";
import type {
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
  timeout: 20000, // 20s safety
  // DO NOT set default Content-Type; axios will set per request
});

// Ensure FormData isn't converted or given a JSON content-type
delete api.defaults.headers.post?.["Content-Type"];
delete api.defaults.headers.put?.["Content-Type"];
api.defaults.transformRequest = [(data: any, headers: any) => {
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    if (headers) {
      delete headers["Content-Type"]; // let browser add boundary
      delete headers["content-type"];
    }
  }
  return data;
}];

// Attach Firebase token on every request
api.interceptors.request.use(async (cfg) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    cfg.headers = cfg.headers || {};
    (cfg.headers as any).Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// --------------------
// Helpers for PWA caching
// --------------------

// Force-bypass SW cache (adds a cache-busting query param)
export function getFresh<T = any>(url: string, config?: AxiosRequestConfig) {
  const ts = Date.now().toString();
  const params = { ...(config?.params || {}), _ts: ts };
  return api.get<T>(url, { ...(config || {}), params });
}

// Ask the SW to clear API caches (use on logout)
export async function clearApiCaches() {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const ctrl = navigator.serviceWorker.controller;
    if (reg && ctrl) ctrl.postMessage({ type: "CLEAR_API_CACHE" });
  }
}

// --------------------
// Normalizers
// --------------------
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
export const updateUser   = (data: UserProfileOnSend) => api.post("/user/update", data);

export async function getMyProfile(): Promise<UserProfileOnReceive> {
  // prefer fresh data; if the network is slow/offline the SW NetworkFirst will fall back to cache
  const res = await getFresh("/user/profile");
  return normalizeProfile(res.data);
}

export const searchUser = (q: SearchQuery) =>
  api.post<UserProfileOnSearchResponse[]>("/user/search", q);

export const getDepartments = () =>
  api.get<Department[]>("/meta/departments").then((r) => r.data);
export const getSchools = () =>
  api.get<School[]>("/meta/schools").then((r) => r.data);
export const getProgrammes = () =>
  api.get<Programme[]>("/meta/programmes").then((r) => r.data);

export const setLike    = (body: SetLikes)   => api.post("/relation/set", body);
export const setBlock   = (body: SetBlock)   => api.post("/relation/set", body);
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
  const res = await api.put("/user/profile/update", fd); // let browser set boundary
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
