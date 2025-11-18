// src/mobile/pages/ProfileMobile.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getMyProfile,
  uploadAvatar,
  getPosts as apiGetPosts,
} from "../../shared/api";
import type { UserProfileOnReceive } from "../../shared/types";
import { Settings, Upload, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { INTERESTS } from "../../shared/constants/interests";
import { calculateAge } from "../../shared/utils/age";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImageFile } from "../../shared/utils/cropper";
import Portal from "../../shared/components/portal";
import { useToast } from "../../shared/components/Toast";
import { motion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*                                WORKER BASE                                 */
/* -------------------------------------------------------------------------- */

const WORKER_BASE =
  "https://r2-image-proxy.files-tu-dating-app.workers.dev/";


/* ---------------- LOOKING FOR MAP ----------------
   adjust values if your backend uses different codes */
   const LOOKING_FOR_MAP: Record<number, string> = {
    0: "Dating and vibing",
    1: "Long-term commitment",
    2: "Something casual",
    3: "I’m not sure"
  };


/* -------------------------------------------------------------------------- */
/*                       STABLE WORKER URL BUILDERS (FIXED)                   */
/* -------------------------------------------------------------------------- */

function toWorkerAvatarUrlClean(input?: string | null) {
  if (!input) return "";
  let v = String(input).trim();

  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      v = u.pathname.replace(/^\//, "");
    } catch {}
  }

  const match = v.match(/avatars\/[^/?#]+\.jpg/i);
  const finalPath = match ? match[0] : v.replace(/^\//, "");
  return `${WORKER_BASE}${finalPath}`;
}

function toWorkerPostUrlClean(input?: string | null) {
  if (!input) return "";
  let v = String(input).trim();

  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      v = u.pathname.replace(/^\//, "");
    } catch {}
  }

  v = v.replace(/^\//, "");

  if (!v.startsWith("user_posts/")) {
    const idx = v.indexOf("user_posts/");
    if (idx !== -1) v = v.substring(idx);
  }

  return `${WORKER_BASE}${v}`;
}

/* -------------------------------------------------------------------------- */
/*                                  COMPRESS                                  */
/* -------------------------------------------------------------------------- */

async function compressImage(file: File, maxKB = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();

    fr.onload = (e) => (img.src = e.target?.result as string);
    fr.onerror = reject;
    img.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let w = img.width,
        h = img.height;

      const max = 800;
      if (w > h && w > max) {
        h = (h * max) / w;
        w = max;
      } else if (h > w && h > max) {
        w = (w * max) / h;
        h = max;
      }

      canvas.width = w;
      canvas.height = h;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      let q = 0.9;

      const loop = () =>
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("No blob");
            if (blob.size / 1024 > maxKB && q > 0.2) {
              q -= 0.1;
              loop();
            } else {
              resolve(
                new File(
                  [blob],
                  file.name.replace(/\.(png|avif|webp|heic|heif)$/i, ".jpg"),
                  { type: "image/jpeg" }
                )
              );
            }
          },
          "image/jpeg",
          q
        );

      loop();
    };

    fr.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type UserPost = {
  id: number;
  user_id: number;
  picture: string;
  caption: string;
  posted_on: string;

  // NEW – stable URL assigned on load
  workerUrl: string;
};

/* -------------------------------------------------------------------------- */
/*                           MAIN COMPONENT START                             */
/* -------------------------------------------------------------------------- */

export default function UserProfileMobile() {
  const [profile, setProfile] =
    useState<UserProfileOnReceive | null>(null);
  const [loading, setLoading] = useState(true);

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [origFilename, setOrigFilename] = useState("avatar.jpg");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  const [imageLoading, setImageLoading] = useState(true);
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [postImageStatus, setPostImageStatus] = useState<
    Record<number, "loading" | "loaded" | "error">
  >({});

  const [activePostId, setActivePostId] = useState<number | null>(
    null
  );

  const [prevAvatarUrl, setPrevAvatarUrl] =
    useState<string | null>(null);

  const navigate = useNavigate();
  const { push } = useToast();

  /* -------------------------------------------------------------------------- */
  /*                             FORMAT UTILITIES                               */
  /* -------------------------------------------------------------------------- */

  function formatDate(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const day = d.getDate();
    const m = d.toLocaleString("default", { month: "long" });
    const y = d.getFullYear();

    const suf =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";

    return `${day}${suf} ${m}, ${y}`;
  }

  function extractJoinYear(email?: string | null) {
    if (!email) return null;
    const pre = email.split("@")[0];
    const m = pre.match(/(\d{2})/);
    return m ? Number("20" + m[1]) : null;
  }

  /* -------------------------------------------------------------------------- */
  /*                          OPEN CROPPER (UNCHANGED)                          */
  /* -------------------------------------------------------------------------- */

  const openCropperForFile = (file: File) => {
    if (pickedUrl) URL.revokeObjectURL(pickedUrl);

    const url = URL.createObjectURL(file);

    setPickedUrl(url);
    setOrigFilename(file.name || "avatar.jpg");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropOpen(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                         CONFIRM CROP + UPLOAD AVATAR                       */
  /* -------------------------------------------------------------------------- */

  const confirmCropAndUpload = async () => {
    if (!pickedUrl || !croppedAreaPixels) return;

    setIsCropOpen(false);
    setAvatarUpdating(true);

    try {
      const cropped = await getCroppedImageFile(
        pickedUrl,
        {
          x: Math.round(croppedAreaPixels.x),
          y: Math.round(croppedAreaPixels.y),
          width: Math.round(croppedAreaPixels.width),
          height: Math.round(croppedAreaPixels.height),
        },
        800,
        origFilename
      );

      const compressed = await compressImage(cropped);

      const resp = await uploadAvatar(compressed);
      if (!resp?.avatar_url)
        throw new Error("No avatar_url returned");

      // Cache-bust ONLY avatar (correct behavior)
      const newUrl =
        toWorkerAvatarUrlClean(resp.avatar_url) + "?v=" + Date.now();

      setImageLoading(true);
      setProfile((p) =>
        p
          ? {
              ...p,
              avataar: newUrl,
            }
          : p
      );

      push({ message: "Profile updated!", variant: "success" });
    } catch (err) {
      console.error(err);
      push({ message: "Avatar upload failed", variant: "error" });
      setAvatarUpdating(false);
    }

    if (pickedUrl) URL.revokeObjectURL(pickedUrl);
    setPickedUrl(null);
  };

  /* -------------------------------------------------------------------------- */
  /*                              LOAD PROFILE                                  */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const data: any = await getMyProfile();
        const raw = data.avataar || data.avatar_url || data.avatar;

        // Stable avatar (NO ?v=Date.now() here)
        const stable = toWorkerAvatarUrlClean(raw);

        setProfile({ ...data, avataar: stable });
        setImageLoading(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                                LOAD POSTS                                  */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      setPostsLoading(true);
      try {
        const r: any = await apiGetPosts();
        const arr = Array.isArray(r) ? r : r.data ?? [];

        const sorted = arr
          .slice()
          .sort(
            (a: UserPost, b: UserPost) =>
              new Date(b.posted_on).getTime() -
              new Date(a.posted_on).getTime()
          );

        // FIXED: assign stable worker URL ONCE
        const stablePosts = sorted.map((p: UserPost) => ({
          ...p,
          workerUrl: toWorkerPostUrlClean(p.picture),
        }));

        setPosts(stablePosts);
      } catch (err) {
        console.error(err);
      } finally {
        setPostsLoading(false);
      }
    })();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                            CROP SCROLL LOCK                                 */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    document.body.style.overflow = isCropOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCropOpen]);

  const onCropComplete = useCallback((_a: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              AVATAR LOAD EVENT                              */
  /* -------------------------------------------------------------------------- */

  const handleImgLoad = () => {
    setImageLoading(false);
    setAvatarUpdating(false);
  };

  /* -------------------------------------------------------------------------- */
  /*                        CLICK POST → SWITCH AVATAR                           */
  /* -------------------------------------------------------------------------- */

  const onPostClick = (p: UserPost) => {
    const active = activePostId === p.id;

    if (active) {
      // restore avatar
      setActivePostId(null);

      if (prevAvatarUrl) {
        setImageLoading(true);
        setProfile((pr) =>
          pr
            ? {
                ...pr,
                avataar: prevAvatarUrl, // stable url
              }
            : pr
        );
      }

      setPrevAvatarUrl(null);
      return;
    }

    // store old avatar
    setPrevAvatarUrl(profile?.avataar ?? null);

    // switch avatar to post image
    setImageLoading(true);
    setProfile((pr) =>
      pr
        ? {
            ...pr,
            avataar: p.workerUrl,
          }
        : pr
    );

    setActivePostId(p.id);
  };

  /* -------------------------------------------------------------------------- */
  /*                                LOADING STATES                              */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex gap-[0.5rem] items-center justify-center h-screen w-screen bg-black text-white">
        <div className="animate-pulse text-[1rem] italic">
          Loading Your Profile
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
          className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        Failed to load profile.
      </div>
    );
  }

    // derive "looking for" display text (support both numeric and string)
    const lookingForText =
    typeof profile.looking_for === "string"
      ? profile.looking_for
      : LOOKING_FOR_MAP[(profile.looking_for as unknown) as number] ?? "—";

  /* -------------------------------------------------------------------------- */
  /*                              MAIN RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#0D0002]">

      {/* ---------------- TOP HEADER ---------------- */}
      <div className="sticky top-[0rem] z-10 w-full">
        <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">

          {/* Settings */}
          <Link
            to="/settings"
            className="absolute top-[0.5rem] left-[0.3rem] bg-[#82817c]/50 px-[0.5rem] pt-[0.5rem] pb-[0.3rem] rounded-full z-[5]"
          >
            <Settings className="h-5 w-5 text-white" />
          </Link>

          {/* Avatar Input */}
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0])
                openCropperForFile(e.target.files[0]);
              e.currentTarget.value = "";
            }}
          />

          <label
            htmlFor="avatar-upload"
            className="absolute top-[0.5rem] right-[0.8rem] cursor-pointer bg-[#82817c]/50 px-[0.5rem] pt-[0.5rem] pb-[0.3rem] rounded-full z-[5]"
          >
            <Upload className="h-5 w-5 text-white" />
          </label>

          {/* Avatar Loading Overlay */}
          {(imageLoading || avatarUpdating) && (
            <img
              src="/profile_loading.png"
              alt="loading-avatar"
              className="absolute inset-[0rem] w-full h-full object-cover z-[2]"
            />
          )}

          {/* Avatar */}
          <img
            src={profile.avataar}
            className={`absolute inset-[0rem] w-full h-full object-cover transition-opacity duration-300 ${
              imageLoading || avatarUpdating
                ? "opacity-0"
                : "opacity-100"
            }`}
            onLoad={handleImgLoad}
          />
        </div>

        {/* Name + edit */}
        <div className="relative -mt-[1.2rem]">
          <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem]">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.1rem] mx-[1rem] font-bold">
                {profile.name}
              </h2>

              <button
                onClick={() =>
                  navigate("/edit-profile", { state: { profile } })
                }
                className="flex items-center justify-center border-none p-[0.5rem] mr-[0.75rem] bg-[#413839] text-white rounded-full"
              >
                <Pencil size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- DETAILS ---------------- */}
      <div className="bg-[#0D0002] w-full px-[0.5rem] pb-[1.25rem]">

        <p className="text-[0.95rem] mx-[1rem] text-white/70 mt-[0.3rem]">
          {profile.dateOfBirth
            ? calculateAge(profile.dateOfBirth)
            : "N/A"}{" "}
          {profile.gender}, {profile.personality}
        </p>

        {/* --- LOOKING FOR: placed directly under the age row to match screenshot --- */}
          <p className="text-[0.95rem] text-white/90 mt-[0.25rem] ml-[1rem]">
            Looking for {lookingForText}
          </p>

        {/* Interests */}
        <div className="mt-[0.6rem] flex mx-[1rem] flex-wrap">
          {profile.interests.map((id: number) => {
            const entry = INTERESTS.find((i) => i.id === id);
            return (
              <span
                key={id}
                className="px-[0.5rem] py-[0.3rem] mx-[0.2rem] my-[0.2rem] text-[0.7rem] rounded-full bg-[#FF5069]"
              >
                {entry ? entry.name : `Unknown (${id})`}
              </span>
            );
          })}
        </div>

        {/* About */}
        <h3 className="mt-[0.8rem] text-[1.25rem] mx-[1rem] font-semibold">
          About me
        </h3>

        <p className="mt-[0.4rem] text-[#cccccc] text-[0.95rem] mx-[1rem] leading-relaxed">
          {profile.bio}
        </p>

        {/* Qualification */}
        <div className="mt-[0.8rem] mx-[1rem]">
          <p className="mt-[0.4rem] text-[#cccccc] text-[0.95rem]">
            {profile.programme_name || "—"},{" "}
            {profile.department_name || "—"},
          </p>

          <p className="text-[#cccccc] text-[0.95rem]">
            {profile.school_name
              ? `School of ${profile.school_name}`
              : ""}
            {(() => {
              const y = extractJoinYear(profile.email);
              return y ? `, since ${y}` : "";
            })()}
          </p>
        </div>

        {/* POSTS */}
        <h2 className="mt-[1rem] text-[1.1rem] mx-[1rem] font-semibold">
          Posts
        </h2>

        {postsLoading ? (
          <p className="mx-[1rem] flex justify-center text-white/60 gap-[0.5rem] mt-[0.5rem]">
            Loading posts
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "linear",
              }}
              className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
            />
          </p>
        ) : posts.length === 0 ? (
          <p className="mx-[0rem] min-h-screen flex justify-center text-white/60 mt-[0.5rem]">
            No posts yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-[0.35rem] mx-[1rem] mt-[0.4rem]">
            {posts.map((p) => {
              const isActive = activePostId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => onPostClick(p)}
                  className="relative rounded overflow-hidden bg-black/10"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <img
                    src={
                      postImageStatus[p.id] === "error"
                        ? "/posts_error.png"
                        : p.workerUrl
                    }
                    alt={p.caption}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                      postImageStatus[p.id] === "loaded"
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    onLoad={() =>
                      setPostImageStatus((s) => ({
                        ...s,
                        [p.id]: "loaded",
                      }))
                    }
                    onError={() =>
                      setPostImageStatus((s) => ({
                        ...s,
                        [p.id]: "error",
                      }))
                    }
                  />

                  {postImageStatus[p.id] !== "loaded" && (
                    <img
                      src="/posts_placeholder.png"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                  )}

                  {isActive && (
                    <div className="absolute bg-[#0D0002]/90 inset-[0rem] flex flex-col justify-center items-center px-[0.5rem] pb-[0.5rem]">
                      <div
                        className="text-white font-semibold"
                        style={{
                          fontSize: "0.85rem",
                          lineHeight: "1rem",
                        }}
                      >
                        "{p.caption}"
                      </div>

                      <div
                        className="text-white/70 mt-[0.2rem]"
                        style={{ fontSize: "0.65rem" }}
                      >
                        {formatDate(p.posted_on)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CROP MODAL */}
      {isCropOpen && (
        <Portal>
          <div className="fixed inset-[0px] p-[1rem] bg-[#0D0002] z-[9999] flex flex-col bg-black/80">
            <div className="relative w-full h-[70vh]">
              {pickedUrl && (
                <Cropper
                  image={pickedUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={0.8}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            <div className="bg-[#0D0002] px-[3rem] pt-[1.5rem] flex flex-col gap-[1.2rem]">
              <button
                onClick={confirmCropAndUpload}
                className="text-[1.2rem] py-[0.3rem] bg-[#FF5069] rounded-[2rem]"
              >
                Use Photo
              </button>

              <button
                onClick={() => {
                  setIsCropOpen(false);
                  if (pickedUrl) URL.revokeObjectURL(pickedUrl);
                  setPickedUrl(null);
                }}
                className="text-[1.2rem] py-[0.3rem] bg-white/10 rounded-[2rem]"
              >
                Cancel
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}



// // src/mobile/pages/ProfileMobile.tsx
// "use client";
// import React, { useEffect, useState, useCallback } from "react";
// import { getMyProfile, uploadAvatar } from "../../shared/api";
// import type { UserProfileOnReceive } from "../../shared/types";
// import { Settings, Upload, Pencil } from "lucide-react";
// import { Link, useNavigate } from "react-router-dom";
// import { INTERESTS } from "../../shared/constants/interests";
// import { calculateAge } from "../../shared/utils/age";
// import Cropper from "react-easy-crop";
// import type { Area } from "react-easy-crop";
// import { getCroppedImageFile } from "../../shared/utils/cropper";
// import Portal from "../../shared/components/portal";
// import { useToast } from "../../shared/components/Toast";
// import { motion} from "framer-motion";

// // Worker base provided by backend
// const WORKER_BASE = "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

// /**
//  * From a full R2 URL or a raw path, extract "avatars/<file>.jpg"
//  * and build the public worker URL.
//  */
// function toWorkerAvatarUrl(input?: string | null): string {
//   if (!input) return "";
//   let value = String(input).trim();

//   // If it's a full URL, pull the pathname
//   if (/^https?:\/\//i.test(value)) {
//     try {
//       const u = new URL(value);
//       value = u.pathname.replace(/^\//, ""); // e.g. "tu-dating-app/avatars/<file>.jpg"
//     } catch {
//       // keep value as-is
//     }
//   }

//   // Always reduce to "avatars/<file>.jpg"
//   const match = value.match(/avatars\/[^/?#]+\.jpg/i);
//   const path = match ? match[0] : `avatars/${value.split("/").pop()}`;

//   // cache-bust so the fresh image shows up immediately
//   return `${WORKER_BASE}${path}?v=${Date.now()}`;
// }

// // JPEG compressor (≤ 300 KB)
// async function compressImage(file: File, maxSizeKB = 300): Promise<File> {
//   return new Promise((resolve, reject) => {
//     const img = new Image();
//     const reader = new FileReader();
//     reader.onload = (e) => { img.src = e.target?.result as string; };
//     reader.onerror = reject;
//     img.onerror = reject;

//     img.onload = () => {
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d");
//       if (!ctx) return reject("Canvas not supported");

//       let width = img.width, height = img.height;
//       const maxDimension = 800; // keep long side manageable
//       if (width > height && width > maxDimension) {
//         height = (height * maxDimension) / width; width = maxDimension;
//       } else if (height > width && height > maxDimension) {
//         width = (width * maxDimension) / height; height = maxDimension;
//       }

//       canvas.width = width; canvas.height = height;
//       ctx.imageSmoothingEnabled = true;
//       ctx.imageSmoothingQuality = "high";
//       ctx.drawImage(img, 0, 0, width, height);

//       let quality = 0.9;
//       const tryCompress = () => {
//         canvas.toBlob((blob) => {
//           if (!blob) return reject("Failed to compress image");
//           if (blob.size / 1024 > maxSizeKB && quality > 0.2) {
//             quality -= 0.1; tryCompress();
//           } else {
//             resolve(new File(
//               [blob],
//               file.name.replace(/\.(png|webp|avif|heic|heif)$/i, ".jpg"),
//               { type: "image/jpeg" }
//             ));
//           }
//         }, "image/jpeg", quality);
//       };
//       tryCompress();
//     };

//     reader.readAsDataURL(file);
//   });
// }

// export default function UserProfileMobile() {
//   const [profile, setProfile] = useState<UserProfileOnReceive | null>(null);
//   const [loading, setLoading] = useState(true);

//   // cropper
//   const [isCropOpen, setIsCropOpen] = useState(false);
//   const [pickedUrl, setPickedUrl] = useState<string | null>(null);
//   const [origFilename, setOrigFilename] = useState<string>("avatar.jpg");
//   const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
//   const [zoom, setZoom] = useState(1);
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

//   // image UX
//   const [avatarRetries, setAvatarRetries] = useState(0);
//   const [imageLoading, setImageLoading] = useState(true);   // true until <img> loads
//   const [avatarUpdating, setAvatarUpdating] = useState(false); // true while uploading & waiting for new img load

//   const navigate = useNavigate();
//   const { push } = useToast();

//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await getMyProfile();
//         const raw =
//           (data as any).avataar || (data as any).avatar_url || (data as any).avatar;
//         setProfile({ ...data, avataar: toWorkerAvatarUrl(raw) });
//         setImageLoading(true); // wait for first avatar to load
//       } catch (err) {
//         console.error("Error fetching profile:", err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // lock page scroll when modal open
//   useEffect(() => {
//     if (isCropOpen) {
//       document.documentElement.style.overflow = "hidden";
//       document.body.style.overflow = "hidden";
//     } else {
//       document.documentElement.style.overflow = "";
//       document.body.style.overflow = "";
//     }
//     return () => {
//       document.documentElement.style.overflow = "";
//       document.body.style.overflow = "";
//     };
//   }, [isCropOpen]);

//   const onCropComplete = useCallback((_a: Area, px: Area) => setCroppedAreaPixels(px), []);

//   const openCropperForFile = (file: File) => {
//     if (pickedUrl) URL.revokeObjectURL(pickedUrl);
//     const url = URL.createObjectURL(file);
//     setOrigFilename(file.name || "avatar.jpg");
//     setPickedUrl(url);
//     setZoom(1);
//     setCrop({ x: 0, y: 0 });
//     setIsCropOpen(true);
//   };

//   const confirmCropAndUpload = async () => {
//     if (!pickedUrl || !croppedAreaPixels) return;

//     // Close the cropper immediately & show loading overlay
//     setIsCropOpen(false);
//     setAvatarUpdating(true);

//     try {
//       // 1) crop
//       const croppedFile = await getCroppedImageFile(
//         pickedUrl,
//         {
//           x: Math.round((croppedAreaPixels as Area).x),
//           y: Math.round((croppedAreaPixels as Area).y),
//           width: Math.round((croppedAreaPixels as Area).width),
//           height: Math.round((croppedAreaPixels as Area).height),
//         },
//         800,
//         origFilename || "avatar.jpg"
//       );
//       // 2) compress (≤300 KB)
//       const compressedFile = await compressImage(croppedFile, 300);

//       // 3) upload (backend returns { avatar_url })
//       const resp = await uploadAvatar(compressedFile);

//       // 4) point to new worker URL, make <img> load it
//       const workerUrl = toWorkerAvatarUrl(resp?.avatar_url);
//       if (workerUrl) {
//         setAvatarRetries(0);
//         setImageLoading(true); // ensure we wait for the new image to finish loading
//         setProfile((prev) => (prev ? { ...prev, avataar: workerUrl } : prev));
//       } else {
//         // no URL returned — stop overlay
//         setAvatarUpdating(false);
//       }

//       // cleanup cropper blob url
//       if (pickedUrl) URL.revokeObjectURL(pickedUrl);
//       setPickedUrl(null);

//       push({
//         message: resp?.message || "Profile updated successfully!",
//         variant: "success",
//       });
//     } catch (err: any) {
//       console.error("Failed to upload avatar:", err);
//       const status = err?.response?.status;
//       const serverText =
//         typeof err?.response?.data === "string"
//           ? err.response.data
//           : err?.response?.data?.message || err?.response?.data?.error || "";

//       push({
//         message:
//           `Failed to upload avatar${status ? ` (HTTP ${status})` : ""}` +
//           (serverText ? `: ${serverText}` : ""),
//         variant: "error",
//         duration: 4000,
//       });

//       // stop overlay on failure
//       setAvatarUpdating(false);

//       // cleanup cropper blob url
//       if (pickedUrl) URL.revokeObjectURL(pickedUrl);
//       setPickedUrl(null);
//     }
//   };

//   // When the <img> finishes loading (initial OR updated), hide overlays
//   const handleImgLoad: React.ReactEventHandler<HTMLImageElement> = () => {
//     setImageLoading(false);
//     setAvatarUpdating(false);
//   };

//   // img onError: retry twice with cache-bust; then fallback
//   const handleImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
//     if (!profile?.avataar) return;

//     if (avatarRetries >= 2) {
//       (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
//       setAvatarUpdating(false); // stop overlay if we give up
//       setImageLoading(false);
//       return;
//     }

//     setAvatarRetries((r) => r + 1);
//     const base = profile.avataar.split("?")[0];
//     const next = `${base}?v=${Date.now()}`;
//     setImageLoading(true);
//     setProfile((prev) => (prev ? { ...prev, avataar: next } : prev));
//   };

//   if (loading) {
//     //Loader for profile page
//     return(
//       <div className="flex gap-[0.5rem] items-center justify-center h-screen w-screen bg-black text-white">

//       {/* Text */}
//       <div className="animate-pulse text-lg italic">
//         Loading Your Profile
//       </div>
//       {/* Spinner */}
//       <motion.div
//         animate={{ rotate: 360 }}
//         transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
//         className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
//       />
//       </div>
//     );
//   }

//   if (!profile) {
//     return (
//       <div className="flex gap-[0.5rem] items-center justify-center h-screen w-screen bg-black text-white">
//         Failed to load profile!!
//       </div>
//     );
//   }

//   return (
//     <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#0D0002]">
//       {/* top */}
//       <div className="sticky top-0 z-10 w-full">
//         <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">
//           <Link
//             to="/settings"
//             className="absolute top-[8px] left-[5px] bg-[#82817c]/50 px-[0.5rem] pt-[0.5rem] pb-[0.3rem] rounded-full z-[5]"
//           >
//             <Settings className="h-5 w-5 text-white" />
//           </Link>

//           <input
//             type="file"
//             accept="image/*"
//             id="avatar-upload"
//             className="hidden"
//             onChange={(e) => {
//               if (e.target.files && e.target.files[0]) {
//                 openCropperForFile(e.target.files[0]);
//                 e.currentTarget.value = "";
//               }
//             }}
//           />

//           <label
//             htmlFor="avatar-upload"
//             className="absolute top-[8px] right-[0.75rem] cursor-pointer bg-[#82817c]/50 px-[0.5rem] pt-[0.5rem] pb-[0.3rem] rounded-full z-[5]"
//           >
//             <Upload className="h-5 w-5 text-white" />
//           </label>

//           {/* Loading overlay image while initial load OR during avatar update */}
//           {(imageLoading || avatarUpdating) && (
//             <img
//               src="/profile_loading.png"
//               alt="Loading avatar"
//               className="absolute inset-0 w-full h-full object-cover z-[2]"
//             />
//           )}

//           {/* Actual avatar */}
//           <img
//             src={profile.avataar || "/profile_placeholder.jpg"}
//             alt={profile.name}
//             className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
//               imageLoading || avatarUpdating ? "opacity-0" : "opacity-100"
//             }`}
//             onLoad={handleImgLoad}
//             onError={handleImgError}
//           />
//         </div>

//         <div className="relative -mt-[1.2rem]">
//           <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem]">
//             <div className="flex items-center justify-between">
//               <h2 className="text-[1.1rem] mx-[1rem] font-bold leading-tight">
//                 {profile.name}
//               </h2>
//               <button
//                 className="flex items-center justify-center border-none p-[0.5rem] mr-[0.75rem] bg-[#413839] text-white rounded-full"
//                 onClick={() => navigate("/edit-profile", { state: { profile } })}
//                 aria-label="Edit profile"
//               >
//                 <Pencil size={24} />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* details */}
//       <div className="bg-[#0D0002] w-full px-[0.5rem] pb-[1.25rem]">
//         <p className="text-[0.95rem] mx-[1rem] text-white/70">
//           {profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : "N/A"}{" "}
//           {profile.gender}, {profile.personality}
//         </p>

//         <div className="mt-[0.6rem] flex mx-[1rem] flex-wrap">
//           {profile.interests.map((id: number) => {
//             const interest = INTERESTS.find((i) => i.id === id);
//             return (
//               <span
//                 key={id}
//                 className="px-[8px] py-[5px] mx-[3px] my-[3px] text-xs rounded-full bg-[#FF5069]"
//               >
//                 {interest ? interest.name : `Unknown (${id})`}
//               </span>
//             );
//           })}
//         </div>

//         <h3 className="mt-[0.8rem] text-[1.25rem] mx-[1rem] font-semibold">About me</h3>
//         <p className="mt-[0.4rem] text-gray-300 text-[0.95rem] mx-[1rem] leading-relaxed">
//           {profile.bio}
//         </p>

//         <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
//       </div>

//       {/* Cropper Modal via Portal */}
//       {isCropOpen && (
//         <Portal>
//           <div className="fixed inset-[0px] p-[1rem] bg-[#0D0002] z-[9999] flex flex-col bg-black/80">
//             <div className="relative w-full h-[70vh] ">
//               {pickedUrl && (
//                 <Cropper
//                   image={pickedUrl}
//                   crop={crop}
//                   zoom={zoom}
//                   aspect={0.8}
//                   onCropChange={setCrop}
//                   onZoomChange={setZoom}
//                   onCropComplete={onCropComplete}
//                   restrictPosition
//                   zoomWithScroll
//                   showGrid={true}
//                   cropShape="rect"
//                   objectFit="cover"
//                   classes={{ containerClassName: "absolute inset-[0px]" }}
//                 />
//               )}
//             </div>

//             <div className="bg-[#0D0002] px-[3rem] pt-[1.5rem] flex flex-col gap-[1.2rem]">
//               <button
//                 className="text-[1.2rem] py-[0.3rem] bg-[#FF5069] rounded-[2rem]"
//                 onClick={confirmCropAndUpload}
//               >
//                 Use Photo
//               </button>
//               <button
//                 className="text-[1.2rem] py-[0.3rem] bg-white/10 rounded-[2rem]"
//                 onClick={() => {
//                   setIsCropOpen(false);
//                   if (pickedUrl) URL.revokeObjectURL(pickedUrl);
//                   setPickedUrl(null);
//                 }}
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </Portal>
//       )}
//     </div>
//   );
// }