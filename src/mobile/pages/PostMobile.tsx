// src/mobile/pages/PostMobile.tsx
"use client";
import React, { useState, useRef, useCallback } from "react";
import { uploadPost } from "../../shared/api";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImageFile } from "../../shared/utils/cropper";
import Portal from "../../shared/components/portal";
import { useToast } from "../../shared/components/Toast";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function PostMobile() {
  const navigate = useNavigate();
  const { push } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [origFilename, setOrigFilename] = useState("post.jpg");

  const [isCropOpen, setIsCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [finalPreview, setFinalPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ NEW success animation state
  const [showSuccess, setShowSuccess] = useState(false);

  const onCropComplete = useCallback((_a: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  const pickImage = () => fileInputRef.current?.click();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (pickedUrl) URL.revokeObjectURL(pickedUrl);

    const url = URL.createObjectURL(file);
    setPickedUrl(url);
    setOrigFilename(file.name || "post.jpg");

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropOpen(true);

    e.currentTarget.value = "";
  }

  /** ✅ Crop → generate final File */
  async function confirmCrop() {
    if (!pickedUrl || !croppedAreaPixels) return;

    try {
      const croppedFile = await getCroppedImageFile(
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

      const previewUrl = URL.createObjectURL(croppedFile);

      setFinalFile(croppedFile);
      setFinalPreview(previewUrl);

      setIsCropOpen(false);

      URL.revokeObjectURL(pickedUrl);
      setPickedUrl(null);
    } catch (err) {
      console.error(err);
      push({ message: "Failed to crop image", variant: "error" });
    }
  }

  /** ✅ Publish + success animation + delayed navigation */
  async function handlePublish() {
    if (!finalFile) {
      push({ message: "Select an image", variant: "error" });
      return;
    }

    try {
      setLoading(true);

      await uploadPost(finalFile, caption.trim());

      push({ message: "Post uploaded ✅", variant: "success" });

      // ✅ Reset UI Preview
      setFinalFile(null);
      setFinalPreview(null);
      setCaption("");

      // ✅ Show success pop
      setShowSuccess(true);

      // ✅ After 2.5s → remove popup & navigate
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/post", { replace: true });
      }, 2500);

    } catch (err) {
      console.error(err);
      push({ message: "Upload failed", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        p-4 flex flex-col bg-[linear-gradient(to_bottom,#1F0004_20%,#360007_80%)]
        min-h-screen w-screen text-white
      "
    >
      <h1 className="text-3xl font-bold px-[0.5rem] mt-4">New Post</h1>
      <p className="text-gray-300 text-sm px-[0.5rem] mt-1">
        Posts (other than your profile picture) show up in your profile.
        Adding more posts increases your matches ❤️
      </p>

      <div className="flex flex-col items-center max-w-screen px-[3.5rem] mt-[2rem]">

        {/* ✅ Image Preview + Caption + Publish hidden when loading */}
        {!loading && !showSuccess &&(
          <>
            {/* ✅ Image Picker / Preview */}
            <div
              className="
                w-full aspect-[4/5] rounded-2xl bg-[#360007] border border-[#0D0002]
                border-x-[0.8rem] border-t-[0.7rem] border-b-[0.9rem] rounded-t-[1rem]
                flex items-center justify-center overflow-hidden
              "
              onClick={pickImage}
            >
              {finalPreview ? (
                <img src={finalPreview} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center opacity-40">
                  <div className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-full">
                    <Plus size={42} className="bg-[#FFFFFF] text-[#0D0002] rounded-full"/>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Caption */}
            <textarea
              className="
                w-full bg-[#0D0002] border border-[#0D0002] border-x-[0.7rem] border-b-[1.2rem]
                rounded-b-[1rem] h-[2.2rem] p-3 text-white placeholder-gray-400
                text-[1.1rem] pt-[0.3rem] resize-none focus:border-[#0D0002] focus:ring-0 focus:outline-none
              "
              rows={3}
              placeholder="Write a caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            {/* Publish */}
            <button
              disabled={!finalFile || loading}
              onClick={handlePublish}
              className={`
                mt-[1.5rem] w-[13rem] py-[0.4rem] text-[1rem] text-center rounded-[3rem]
                ${finalFile ? "bg-[#FF5069]" : "bg-[#707070]"}
                ${loading ? "opacity-50" : ""}
              `}
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          </>
        )}
      </div>

      {/* ✅ Posting Loader */}
      {loading && (
        <div className="fixed w-full h-[35rem] top-[10rem] z-[9998] flex items-center justify-center bg-transparent">
          <div className="px-6 py-4 rounded-2xl flex items-center gap-[0.7rem]">
            <span className="text-[1.4rem] font-semibold text-lg">Posting</span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-[0.9rem] h-[0.9rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
            />
          </div>
        </div>
      )}

      {/* ✅ ✅ SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed inset-[0px] z-[9999] flex items-center justify-center ">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 20 }}
            className="px-[3rem] py-[2rem] text-[1.5rem] rounded-2xl flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 15 }}
              className="w-[2.2rem] h-[2.2rem] rounded-full bg-[#FF5069] flex items-center justify-center"
            >
              <span className="text-black text-[1.8rem] ">✓</span>
            </motion.div>
            <span className="text-xl font-semibold">Posted Successfully!</span>
          </motion.div>
        </div>
      )}

      {/* ✅ Crop Modal */}
      {isCropOpen && (
        <Portal>
          <div className="fixed inset-[0px] p-[1rem] bg-[#0D0002] z-[9999] flex flex-col bg-black/80">
            <div className="relative w-full h-[70vh]">
              {pickedUrl && (
                <Cropper
                  image={pickedUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition
                  zoomWithScroll
                  showGrid={true}
                  objectFit="cover"
                />
              )}
            </div>

            <div className="bg-[#0D0002] px-[3rem] pt-[1.5rem] flex flex-col gap-[1.2rem]">
              <button
                className="text-[1.2rem] py-[0.3rem] bg-[#FF5069] rounded-[2rem]"
                onClick={confirmCrop}
              >
                Use Photo
              </button>
              <button
                className="text-[1.2rem] py-[0.3rem] bg-white/10 rounded-[2rem]"
                onClick={() => {
                  setIsCropOpen(false);
                  if (pickedUrl) URL.revokeObjectURL(pickedUrl);
                  setPickedUrl(null);
                }}
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

// // src/mobile/pages/PostMobile.tsx
// "use client";
// import React, { useState, useRef, useCallback } from "react";
// import { uploadPost } from "../../shared/api";
// import { useNavigate } from "react-router-dom";
// import Cropper from "react-easy-crop";
// import type { Area } from "react-easy-crop";
// import { getCroppedImageFile } from "../../shared/utils/cropper";
// import Portal from "../../shared/components/portal";
// import { useToast } from "../../shared/components/Toast";
// import { Plus } from "lucide-react";
// import { motion } from "framer-motion";

// export default function PostMobile() {
//   const navigate = useNavigate();
//   const { push } = useToast();

//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   const [pickedUrl, setPickedUrl] = useState<string | null>(null);
//   const [origFilename, setOrigFilename] = useState("post.jpg");

//   const [isCropOpen, setIsCropOpen] = useState(false);
//   const [crop, setCrop] = useState({ x: 0, y: 0 });
//   const [zoom, setZoom] = useState(1);
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

//   const [finalFile, setFinalFile] = useState<File | null>(null);
//   const [finalPreview, setFinalPreview] = useState<string | null>(null);
//   const [caption, setCaption] = useState("");

//   const [loading, setLoading] = useState(false);

//   const onCropComplete = useCallback((_a: Area, px: Area) => {
//     setCroppedAreaPixels(px);
//   }, []);

//   const pickImage = () => fileInputRef.current?.click();

//   function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     if (pickedUrl) URL.revokeObjectURL(pickedUrl);

//     const url = URL.createObjectURL(file);
//     setPickedUrl(url);
//     setOrigFilename(file.name || "post.jpg");

//     setCrop({ x: 0, y: 0 });
//     setZoom(1);
//     setIsCropOpen(true);

//     e.currentTarget.value = "";
//   }

//   /** ✅ Crop → generate final File */
//   async function confirmCrop() {
//     if (!pickedUrl || !croppedAreaPixels) return;

//     try {
//       const croppedFile = await getCroppedImageFile(
//         pickedUrl,
//         {
//           x: Math.round(croppedAreaPixels.x),
//           y: Math.round(croppedAreaPixels.y),
//           width: Math.round(croppedAreaPixels.width),
//           height: Math.round(croppedAreaPixels.height),
//         },
//         800,
//         origFilename
//       );

//       const previewUrl = URL.createObjectURL(croppedFile);

//       setFinalFile(croppedFile);
//       setFinalPreview(previewUrl);

//       setIsCropOpen(false);

//       URL.revokeObjectURL(pickedUrl);
//       setPickedUrl(null);
//     } catch (err) {
//       console.error(err);
//       push({ message: "Failed to crop image", variant: "error" });
//     }
//   }

//   /** ✅ Publish + navigate */
//   async function handlePublish() {
//     if (!finalFile) {
//       push({ message: "Select an image", variant: "error" });
//       return;
//     }

//     try {
//       setLoading(true);

//       await uploadPost(finalFile, caption.trim());

//       push({ message: "Post uploaded ✅", variant: "success" });

//       // ✅ Reset UI Preview
//       setFinalFile(null);
//       setFinalPreview(null);
//       setCaption("");

//     } catch (err) {
//       console.error(err);
//       push({ message: "Upload failed", variant: "error" });
//     } finally {
//       setLoading(false);
//       navigate("/post", { replace: true });   // ⬅ you requested to keep /post
//     }
//   }

//   return (
//     <div
//       className="
//         p-4 flex flex-col bg-[linear-gradient(to_bottom,#1F0004_20%,#360007_80%)]
//         min-h-screen w-screen text-white
//       "
//     >
//       <h1 className="text-3xl font-bold px-[0.5rem] mt-4">New Post</h1>
//       <p className="text-gray-300 text-sm px-[0.5rem] mt-1">
//         Posts (other than your profile picture) show up in your profile.
//         Adding more posts increases your matches ❤️
//       </p>

//       <div className="flex flex-col items-center max-w-screen px-[3.5rem] mt-[2rem]">

//         {/* ✅ Image Preview + Caption + Publish hidden when loading */}
//         {!loading && (
//           <>
//             {/* ✅ Image Picker / Preview */}
//             <div
//               className="
//                 w-full aspect-[4/5] rounded-2xl bg-[#360007] border border-[#0D0002]
//                 border-x-[0.8rem] border-t-[0.7rem] border-b-[0.9rem] rounded-t-[1rem]
//                 flex items-center justify-center overflow-hidden
//               "
//               onClick={pickImage}
//             >
//               {finalPreview ? (
//                 <img src={finalPreview} className="w-full h-full object-cover" />
//               ) : (
//                 <div className="flex flex-col items-center justify-center opacity-40">
//                   <div className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-full">
//                     <Plus size={42} className="bg-[#FFFFFF] text-[#0D0002] rounded-full"/>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Hidden Input */}
//             <input
//               type="file"
//               ref={fileInputRef}
//               accept="image/*"
//               className="hidden"
//               onChange={handleFileChange}
//             />

//             {/* Caption */}
//             <textarea
//               className="
//                 w-full bg-[#0D0002] border border-[#0D0002] border-x-[0.7rem] border-b-[1.2rem]
//                 rounded-b-[1rem] h-[2.2rem] p-3 text-white placeholder-gray-400
//                 text-[1.1rem] pt-[0.3rem] resize-none focus:border-[#0D0002] focus:ring-0 focus:outline-none
//               "
//               rows={3}
//               placeholder="Write a caption"
//               value={caption}
//               onChange={(e) => setCaption(e.target.value)}
//             />

//             {/* Publish */}
//             <button
//               disabled={!finalFile || loading}
//               onClick={handlePublish}
//               className={`
//                 mt-[1.5rem] w-[13rem] py-[0.4rem] text-[1rem] text-center rounded-[3rem]
//                 ${finalFile ? "bg-[#FF5069]" : "bg-[#707070]"}
//                 ${loading ? "opacity-50" : ""}
//               `}
//             >
//               {loading ? "Publishing..." : "Publish"}
//             </button>
//           </>
//         )}
//       </div>

//       {/* ✅ Posting Loader */}
//       {loading && (
//         <div className="fixed w-full h-[35rem] top-[10rem] z-[9998] flex items-center justify-center bg-transparent">
//           <div className="px-6 py-4 rounded-2xl flex items-center gap-[0.7rem]">
//             <span className="text-[1.4rem] font-semibold text-lg">Posting</span>
//             <motion.div
//               animate={{ rotate: 360 }}
//               transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
//               className="w-[0.9rem] h-[0.9rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
//             />
//           </div>
//         </div>
//       )}

//       {/* ✅ Crop Modal */}
//       {isCropOpen && (
//         <Portal>
//           <div className="fixed inset-[0px] p-[1rem] bg-[#0D0002] z-[9999] flex flex-col bg-black/80">
//             <div className="relative w-full h-[70vh]">
//               {pickedUrl && (
//                 <Cropper
//                   image={pickedUrl}
//                   crop={crop}
//                   zoom={zoom}
//                   aspect={4 / 5}
//                   onCropChange={setCrop}
//                   onZoomChange={setZoom}
//                   onCropComplete={onCropComplete}
//                   restrictPosition
//                   zoomWithScroll
//                   showGrid={true}
//                   objectFit="cover"
//                 />
//               )}
//             </div>

//             <div className="bg-[#0D0002] px-[3rem] pt-[1.5rem] flex flex-col gap-[1.2rem]">
//               <button
//                 className="text-[1.2rem] py-[0.3rem] bg-[#FF5069] rounded-[2rem]"
//                 onClick={confirmCrop}
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

