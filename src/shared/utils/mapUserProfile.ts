// src/shared/utils/mapUserProfile.ts
import { INTERESTS } from "../constants/interests";
import type { UserProfileOnReceive, UserProfileToShow } from "../types";

const WORKER_BASE = "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

export function mapUserProfile(data: UserProfileOnReceive): UserProfileToShow {
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    dateOfBirth: (data as any).dateOfBirth || (data as any).dateofbirth,
    gender: data.gender,
    bio: data.bio,
    avataar: data.avataar
      ? `${WORKER_BASE}${data.avataar}`
      : "/profile_placeholder.jpg",
    preferred_gender: data.preferred_gender,
    school_name: data.school_name,
    programme_name: data.programme_name,
    department_name: data.department_name,
    personality: data.personality,
    looking_for: (data as any).looking_for ?? null,
    interests: data.interests
      .map((id: number) => {
        const match = INTERESTS.find((i) => i.id === id);
        return match ? match.name : null;
      })
      .filter((name): name is string => name !== null),
    has_liked: false,
    is_blocked: false,
    has_blocked: false,
    posts: [],
  };
}
