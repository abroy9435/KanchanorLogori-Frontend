// src/shared/utils/emailDomain.ts
export function isTezuEmail(email: string | null | undefined): boolean {
    return /^[^@\s]+@tezu\.ac\.in$/i.test((email || "").trim());
  }
  