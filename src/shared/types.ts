
// export type LoginResponse = { token?: string; user?: { userId?: string; username?: string } };

// types.ts

// types.ts
// src/shared/types.ts
// ---------- USER PROFILE ----------
export interface UserProfileOnReceive {
  uid: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth?: string | null; // YYYY-MM-DD
  bio: string;
  avataar: string;
  preferred_gender: string;
  school_name: string;
  programme_name: string;
  department_name: string;
  personality: string;
  looking_for: number;
  interests: number[]; // backend may return ids or names
}

export interface UserProfileOnSend {
  gender: string;
  dateOfBirth: string; // YYYY-MM-DD
  bio: string;
  avataar: string;
  preferred_gender: string;
  school_id: number;
  programme_id: number;
  department_id: number;
  personality: string;
  looking_for: number;
  interests: number[]; // ids to send
}

// Optional update model
export interface UserProfileOnUpdate {
  gender: string;
  dateOfBirth: string;
  bio: string;
  preferred_gender: string;
  school_id: number;
  programme_id: number;
  department_id: number;
  personality: string;
  looking_for: number;
  interests: number[];
}

// Profile shown in feed/discovery
export interface UserProfileToShow {
  uid: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bio: string;
  avataar: string;
  preferred_gender: string;
  school_name: string;
  programme_name: string;
  department_name: string;
  personality: string;
  looking_for: number;
  interests: string[];
  has_liked: boolean;
  is_blocked: boolean;
  has_blocked: boolean;
  posts: UserPost[];
  backup?: string;
}

// ---------- POSTS ----------
export interface UserPost {
  picture: string;
  caption: string;
  posted_on: string;
}
