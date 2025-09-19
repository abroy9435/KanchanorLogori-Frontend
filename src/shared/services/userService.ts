import api from "../api";
import type { UserProfileOnReceive, UserProfileOnSend } from "../types";

// 200 => existing user profile
// 404 => new user (no profile yet)
export async function getMyProfile() {
    try {
        const res = await api.get<UserProfileOnReceive>("/user/profile");
        console.log("PROFILE SUCCESS:", res);
        return res.data;
    } 
    catch (err: any) {
        console.error("PROFILE ERROR:", err?.response || err);
        throw err;
    } 
}

export async function registerUser(payload: UserProfileOnSend) {
  // backend expects Authorization: Bearer <firebase-id-token> (interceptor adds it)
  const res = await api.post("/user/register", payload);
  return res.data;
}
