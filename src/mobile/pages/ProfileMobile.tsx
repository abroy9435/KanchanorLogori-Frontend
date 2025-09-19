// src/mobile/pages/ProfileMobile.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { getMyProfile, uploadAvatar } from "../../shared/api";
import type { UserProfileOnReceive } from "../../shared/types";
import { Settings, Upload, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { INTERESTS } from "../../shared/constants/interests";
import { calculateAge } from "../../shared/utils/age";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImageFile } from "../../shared/utils/cropper";
import Portal from "../../shared/components/portal";
import { useToast } from "../../shared/components/Toast"; // <-- added

// Worker base provided by backend
const WORKER_BASE = "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

/**
 * From a full R2 URL or a raw path, extract "avatars/<file>.jpg"
 * and build the public worker URL.
 */
function toWorkerAvatarUrl(input?: string | null): string {
  if (!input) return "";
  let value = String(input).trim();

  // If it's a full URL, pull the pathname
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      value = u.pathname.replace(/^\//, ""); // e.g. "tu-dating-app/avatars/<file>.jpg"
    } catch {
      // keep value as-is
    }
  }

  // Always reduce to "avatars/<file>.jpg"
  const match = value.match(/avatars\/[^/?#]+\.jpg/i);
  const path = match ? match[0] : `avatars/${value.split("/").pop()}`;

  // cache-bust so the fresh image shows up immediately
  return `${WORKER_BASE}${path}?v=${Date.now()}`;
}

// JPEG compressor (≤ 300 KB)
async function compressImage(file: File, maxSizeKB = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = reject;
    img.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas not supported");

      let width = img.width, height = img.height;
      const maxDimension = 800; // keep long side manageable
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width; width = maxDimension;
      } else if (height > width && height > maxDimension) {
        width = (width * maxDimension) / height; height = maxDimension;
      }

      canvas.width = width; canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return reject("Failed to compress image");
          if (blob.size / 1024 > maxSizeKB && quality > 0.2) {
            quality -= 0.1; tryCompress();
          } else {
            resolve(new File(
              [blob],
              file.name.replace(/\.(png|webp|avif|heic|heif)$/i, ".jpg"),
              { type: "image/jpeg" }
            ));
          }
        }, "image/jpeg", quality);
      };
      tryCompress();
    };

    reader.readAsDataURL(file);
  });
}

export default function UserProfileMobile() {
  const [profile, setProfile] = useState<UserProfileOnReceive | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // cropper
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [origFilename, setOrigFilename] = useState<string>("avatar.jpg");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // pinch/wheel zoom only
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // onError retries then fallback
  const [avatarRetries, setAvatarRetries] = useState(0);

  const navigate = useNavigate();
  const { push } = useToast(); // <-- added

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        const raw =
          (data as any).avataar || (data as any).avatar_url || (data as any).avatar;
        setProfile({ ...data, avataar: toWorkerAvatarUrl(raw) });
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // lock page scroll when modal open
  useEffect(() => {
    if (isCropOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isCropOpen]);

  const onCropComplete = useCallback((_a: Area, px: Area) => setCroppedAreaPixels(px), []);

  const openCropperForFile = (file: File) => {
    if (pickedUrl) URL.revokeObjectURL(pickedUrl);
    const url = URL.createObjectURL(file);
    setOrigFilename(file.name || "avatar.jpg");
    setPickedUrl(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setIsCropOpen(true);
  };

  const confirmCropAndUpload = async () => {
    if (!pickedUrl || !croppedAreaPixels) return;
    setBusy(true);
    try {
      // 1) crop -> 2) compress (≤300 KB)
      const croppedFile = await getCroppedImageFile(
        pickedUrl,
        {
          x: Math.round((croppedAreaPixels as Area).x),
          y: Math.round((croppedAreaPixels as Area).y),
          width: Math.round((croppedAreaPixels as Area).width),
          height: Math.round((croppedAreaPixels as Area).height),
        },
        800,
        origFilename || "avatar.jpg"
      );
      const compressedFile = await compressImage(croppedFile, 300);

      // 3) upload; backend responds with { avatar_url } (full R2 URL)
      const resp = await uploadAvatar(compressedFile);

      // 4) convert to worker URL immediately using only the "avatars/<file>.jpg" part
      const workerUrl = toWorkerAvatarUrl(resp?.avatar_url);
      if (workerUrl) {
        setAvatarRetries(0);
        setProfile((prev) => (prev ? { ...prev, avataar: workerUrl } : prev));
      }

      setIsCropOpen(false);
      if (pickedUrl) URL.revokeObjectURL(pickedUrl);
      setPickedUrl(null);

      // ---- replaced alert() with toast ----
      push({
        message: resp?.message || "Profile updated successfully!",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Failed to upload avatar:", err);
      const status = err?.response?.status;
      const serverText =
        typeof err?.response?.data === "string"
          ? err.response.data
          : err?.response?.data?.message || err?.response?.data?.error || "";

      // ---- replaced alert() with toast ----
      push({
        message:
          `Failed to upload avatar${status ? ` (HTTP ${status})` : ""}` +
          (serverText ? `: ${serverText}` : ""),
        variant: "error",
        duration: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  // img onError: two retries then placeholder
  const handleImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    if (!profile?.avataar) return;
    if (avatarRetries >= 2) {
      (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
      return;
    }
    setAvatarRetries((r) => r + 1);
    const base = profile.avataar.split("?")[0];
    const next = `${base}?v=${Date.now()}`;
    setProfile((prev) => (prev ? { ...prev, avataar: next } : prev));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
        Failed to load profile.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#0D0002]">
      {/* top */}
      <div className="sticky top-0 z-10 w-full">
        <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">
          <Link
            to="/settings"
            className="absolute top-[8px] left-[5px] bg-[#82817c]/50 p-[0.5rem] rounded-full z-[5]"
          >
            <Settings className="h-5 w-5 text-white" />
          </Link>

        <input
            type="file"
            accept="image/*"
            id="avatar-upload"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                openCropperForFile(e.target.files[0]);
                e.currentTarget.value = "";
              }
            }}
          />

          <label
            htmlFor="avatar-upload"
            className="absolute top-[8px] right-[0.75rem] cursor-pointer bg-[#82817c]/50 p-[0.5rem] rounded-full z-[5]"
          >
            <Upload className="h-5 w-5 text-white" />
          </label>

          <img
            src={profile.avataar || "/profile_placeholder.jpg"}
            alt={profile.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleImgError}
          />
        </div>

        <div className="relative -mt-[1.2rem]">
          <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] pb-[0.6rem]">
            <div className="flex items-center justify-between">
              <h2 className="text-[1.8rem] mx-[1rem] font-bold leading-tight">
                {profile.name}
              </h2>
              <button
                className="flex items-center justify-center border-none p-[0.5rem] mr-[0.75rem] text-white rounded-full"
                onClick={() => navigate("/edit-profile", { state: { profile } })}
                aria-label="Edit profile"
              >
                <Pencil size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* details */}
      <div className="bg-[#0D0002] w-full px-[0.5rem] pt-[0.6rem] pb-[1.25rem]">
        <p className="text-[0.95rem] mx-[1rem] text-white/70">
          {profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : "N/A"}{" "}
          {profile.gender}, {profile.personality}
        </p>

        <div className="mt-[0.6rem] flex mx-[1rem] flex-wrap">
          {profile.interests.map((id: number) => {
            const interest = INTERESTS.find((i) => i.id === id);
            return (
              <span
                key={id}
                className="px-[8px] py-[5px] mx-[3px] my-[3px] text-xs rounded-full bg-[#FF5069]"
              >
                {interest ? interest.name : `Unknown (${id})`}
              </span>
            );
          })}
        </div>

        <h3 className="mt-[0.8rem] text-[1.25rem] mx-[1rem] font-semibold">About me</h3>
        <p className="mt-[0.4rem] text-gray-300 text-[0.95rem] mx-[1rem] leading-relaxed">
          {profile.bio}
        </p>

        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </div>

      {/* Cropper Modal via Portal */}
      {isCropOpen && (
        <Portal>
          <div className="fixed inset-[0px] z-[9999] flex flex-col bg-black/80 overflow-hidden">
            <div className="relative w-full h-[70vh] min-h-0">
              {pickedUrl && (
                <Cropper
                  image={pickedUrl}
                  crop={crop}
                  zoom={zoom}           // pinch/scroll to zoom; no slider
                  aspect={0.8}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition
                  zoomWithScroll
                  showGrid={true}
                  cropShape="rect"
                  objectFit="cover"
                  classes={{ containerClassName: "absolute inset-0" }}
                />
              )}
            </div>

            <div className="bg-[#0D0002] p-4 flex justify-between">
              <button
                className="px-4 py-2 bg-white/10 rounded-xl"
                onClick={() => {
                  setIsCropOpen(false);
                  if (pickedUrl) URL.revokeObjectURL(pickedUrl);
                  setPickedUrl(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#FF5069] rounded-xl"
                onClick={confirmCropAndUpload}
                disabled={busy}
              >
                {busy ? "Uploading..." : "Use Photo"}
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

// // src/mobile/pages/UserProfileMobile.tsx
// "use client";
// import React, { useEffect, useState } from "react";
// import { getMyProfile, updateProfilePic } from "../../shared/api";
// import type { UserProfileOnReceive } from "../../shared/types";
// import { Settings, Upload, Pencil } from "lucide-react";
// import { Link, useNavigate } from "react-router-dom";
// import { INTERESTS } from "../../shared/constants/interests";
// import { calculateAge } from "../../shared/utils/age";
// import { auth } from "../../shared/utils/firebase";

// // Helper function to compress image to ≤ 300 KB
// async function compressImage(file: File, maxSizeKB = 300): Promise<File> {
//   return new Promise((resolve, reject) => {
//     const img = new Image();
//     const reader = new FileReader();

//     reader.onload = (e) => {
//       img.src = e.target?.result as string;
//     };
//     reader.onerror = reject;
//     img.onerror = reject;

//     img.onload = () => {
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d");
//       if (!ctx) return reject("Canvas not supported");

//       let width = img.width;
//       let height = img.height;

//       const maxDimension = 800;
//       if (width > height && width > maxDimension) {
//         height = (height * maxDimension) / width;
//         width = maxDimension;
//       } else if (height > width && height > maxDimension) {
//         width = (width * maxDimension) / height;
//         height = maxDimension;
//       }

//       canvas.width = width;
//       canvas.height = height;
//       ctx.drawImage(img, 0, 0, width, height);

//       let quality = 0.9;
//       function tryCompress() {
//         canvas.toBlob(
//           (blob) => {
//             if (!blob) return reject("Failed to compress image");
//             if (blob.size / 1024 > maxSizeKB && quality > 0.1) {
//               quality -= 0.1;
//               tryCompress();
//             } else {
//               const newFile = new File([blob], file.name, { type: "image/jpeg" });
//               resolve(newFile);
//             }
//           },
//           "image/jpeg",
//           quality
//         );
//       }
//       tryCompress();
//     };

//     reader.readAsDataURL(file);
//   });
// }

// export default function UserProfileMobile() {
//   const [profile, setProfile] = useState<UserProfileOnReceive | null>(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     async function fetchProfile() {
//       try {
//         const data = await getMyProfile();
//         setProfile(data);
//       } catch (err) {
//         console.error("Error fetching profile:", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchProfile();
//   }, []);

//   const handleAvatarUpload = async (file: File) => {
//     try {
//       const compressedFile = await compressImage(file, 300);

//       const formData = new FormData();
//       formData.append("file", compressedFile);
//       const updateJson = new Blob([JSON.stringify({})], { type: "application/json" });
//       formData.append("update_json", updateJson);

//       const token = await auth.currentUser?.getIdToken();
//       if (!token) throw new Error("User not authenticated");

//       await updateProfilePic(formData);

//       setProfile((prev) =>
//         prev ? { ...prev, avataar: URL.createObjectURL(compressedFile) } : prev
//       );

//       alert("Profile picture updated!");
//     } catch (err) {
//       console.error("Failed to upload avatar:", err);
//       alert("Failed to upload avatar.");
//     }
//   };

//   // ---------------------------
//   // Loading / Empty states
//   // ---------------------------
//   if (loading) {
//     return (
//       <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
//         Loading profile...
//       </div>
//     );
//   }

//   if (!profile) {
//     return (
//       <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
//         Failed to load profile.
//       </div>
//     );
//   }

//   // ---------------------------
//   // Polished UI (mirrors FeedMobile layout)
//   // ---------------------------
//   return (
//     <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#0D0002]">
//       {/* ===== Sticky top block: Avatar + Header (name + edit) ===== */}
//       <div className="sticky top-0 z-10 w-full">
//         {/* IMAGE: same aspect & rounded top as FeedMobile */}
//         <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">
//           {/* Settings (top-left) */}
//           <Link
//             to="/settings"
//             className="absolute top-[8px] left-[5px] bg-[#82817c]/50 p-[0.5rem] rounded-full z-[5]"
//           >
//             <Settings className="h-5 w-5 text-white" />
//           </Link>

//           {/* Hidden file input for upload */}
//           <input
//             type="file"
//             accept="image/*"
//             id="avatar-upload"
//             className="hidden"
//             onChange={(e) => {
//               if (e.target.files && e.target.files[0]) {
//                 handleAvatarUpload(e.target.files[0]);
//               }
//             }}
//           />

//           {/* Upload (top-right) */}
//           <label
//             htmlFor="avatar-upload"
//             className="absolute top-[8px] right-[0.75rem] cursor-pointer bg-[#82817c]/50 p-[0.5rem] rounded-full z-[5]"
//           >
//             <Upload className="h-5 w-5 text-white" />
//           </label>

//           {/* actual photo */}
//           <img
//             src={profile.avataar || "/profile_placeholder.jpg"}
//             alt={profile.name}
//             className="absolute inset-0 w-full h-full object-cover"
//             onError={(e) => {
//               (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
//             }}
//           />
//         </div>

//         {/* Header row (overlapping slab) to match FeedMobile */}
//         <div className="relative -mt-[1.2rem]">
//           <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] pb-[0.6rem]">
//             <div className="flex items-center justify-between">
//               <h2 className="text-[1.8rem] mx-[1rem] font-bold leading-tight">
//                 {profile.name}
//               </h2>

//               {/* Edit profile button (kept functionality) */}
//               <button
//                 className="flex items-center justify-center border-none p-[0.5rem] mr-[0.75rem] text-white rounded-full"
//                 onClick={() => navigate("/edit-profile", { state: { profile } })}
//                 aria-label="Edit profile"
//               >
//                 <Pencil size={24} />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ===== Scrollable details (behind sticky header) ===== */}
//       <div className="bg-[#0D0002] w-full px-[0.5rem] pt-[0.6rem] pb-[1.25rem]">
//         <p className="text-[0.95rem] mx-[1rem] text-white/70">
//           {profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : "N/A"}{" "}
//           {profile.gender}, {profile.personality}
//         </p>

//         {/* interests (same pill style as FeedMobile) */}
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

//         {/* Safe area padding at bottom for mobile */}
//         <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
//       </div>
//     </div>
//   );
// }
