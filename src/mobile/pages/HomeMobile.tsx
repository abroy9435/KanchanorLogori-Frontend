


// // src/mobile/pages/FeedMobile.tsx
// "use client";
// import MobileLayout from "../layout/MobileLayout";
// import React, { useEffect, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { getRandomProfiles, setLike } from "../../shared/api";
// import { INTERESTS } from "../../shared/constants/interests";
// import type {
//   UserProfileToShow,
//   UserProfileOnReceive,
// } from "../../shared/types";
// import LikeButton from "../../shared/components/LikeButton";

// export default function FeedMobile() {
//   const [profiles, setProfiles] = useState<UserProfileToShow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentIndex, setCurrentIndex] = useState(0);

//   // Fetch profiles
//   useEffect(() => {
//     async function fetchProfiles() {
//       try {
//         const data: UserProfileOnReceive[] = await getRandomProfiles();

//         const mappedProfiles: UserProfileToShow[] = data.map((p) => ({
//           uid: p.uid,
//           name: p.name,
//           email: p.email,
//           dateOfBirth: p.dateofbirth,
//           gender: p.gender,
//           bio: p.bio,
//           avataar: p.avataar
//             ? `https://r2-image-proxy.files-tu-dating-app.workers.dev/${p.avataar}`
//             : "/profile_placeholder.jpg",
//           preferred_gender: p.preferred_gender,
//           school_name: p.school_name,
//           programme_name: p.programme_name,
//           department_name: p.department_name,
//           personality: p.personality,
//           looking_for: p.looking_for,
//           interests: p.interests
//             .map((id: number) => {
//               const match = INTERESTS.find((i) => i.id === id);
//               return match ? match.name : null;
//             })
//             .filter(
//               (name: string | null): name is string => name !== null
//             ),
//           has_liked: false,
//           is_blocked: false,
//           has_blocked: false,
//           posts: [],
//         }));

//         setProfiles(mappedProfiles);
//       } catch (err) {
//         console.error("Error fetching profiles:", err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchProfiles();
//   }, []);

//   const handleLike = async (profileId: string) => {
//     try {
//       await setLike({ likes: [profileId] });
//       setProfiles((prev) =>
//         prev.map((p, i) =>
//           i === currentIndex ? { ...p, has_liked: !p.has_liked } : p
//         )
//       );
//     } catch (err) {
//       console.error("Error liking profile", err);
//     }
//   };

//   const nextProfile = () => {
//     setCurrentIndex((prev) => Math.min(prev + 1, profiles.length));
//   };

//   const prevProfile = () => {
//     setCurrentIndex((prev) => Math.max(prev - 1, 0));
//   };

//   if (loading) {
//     return (
//       <div className="flex flex-col justify-center items-center h-full text-gray-300">
//         Loading profiles...
//       </div>
//     );
//   }

//   if (currentIndex >= profiles.length) {
//     return (
//       <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
//         <h2 className="text-lg font-semibold">No more profiles!</h2>
//         <p className="text-gray-400 text-sm mt-2">Check back later for more.</p>
//       </div>
//     );
//   }

//   const profile = profiles[currentIndex];

//   return (
//     <div className="flex flex-col items-center justify-center h-full w-full px-4 py-6">
//       <AnimatePresence mode="wait">
//         <motion.div
//           key={profile.uid}
//           initial={{ x: 300, opacity: 0 }}
//           animate={{ x: 0, opacity: 1 }}
//           exit={{ x: -300, opacity: 0 }}
//           transition={{ duration: 0.3 }}
//           drag="x"
//           dragConstraints={{ left: 0, right: 0 }}
//           onDragEnd={(e, { offset }) => {
//             if (offset.x > 100) {
//               prevProfile();
//             } else if (offset.x < -100) {
//               nextProfile();
//             }
//           }}
//           className="bg-gray-900 rounded-2xl shadow-lg w-full max-w-sm overflow-hidden"
//         >
//           {/* Avatar */}
//           <div className="relative w-full h-80">
//             <img
//               src={profile.avataar || "/profile_placeholder.jpg"}
//               alt={profile.name}
//               className="rounded-t-2xl object-cover w-full h-80"
//               onError={(e) => {
//                 (e.target as HTMLImageElement).src =
//                   "/profile_placeholder.jpg";
//               }}
//             />
//           </div>

//           {/* Info */}
//           <div className="p-4">
//           <div className="flex items-center justify-between">
//             <h2 className="text-lg font-bold">{profile.name}</h2>
//             <LikeButton
//               liked={profile.has_liked}
//               onToggle={(liked: boolean) => {
//                 if (liked) {
//                   handleLike(profile.uid);
//                 }
//               }}
//             />

//           </div>

//             <p className="text-xs text-gray-400">
//               {profile.gender} • {profile.department_name} •{" "}
//               {profile.programme_name}
//             </p>

//             {/* Interests */}
//             <div className="mt-3 flex flex-wrap gap-2">
//               {profile.interests.map((interest) => (
//                 <span
//                   key={interest}
//                   className="px-3 py-1 text-xs rounded-full bg-pink-600/20 text-pink-400 border border-pink-500/30"
//                 >
//                   {interest}
//                 </span>
//               ))}
//             </div>

//             <p className="mt-3 text-gray-300 text-sm">{profile.bio}</p>
//           </div>
//         </motion.div>
//       </AnimatePresence>
//     </div>
//   );
// }
