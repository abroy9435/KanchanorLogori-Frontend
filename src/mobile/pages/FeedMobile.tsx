// src/mobile/pages/FeedMobile.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { getRandomProfiles, setLike, setBlock, setUnblock, submitUserReport, type ReportReason } from "../../shared/api"; // ⬅ added submitUserReport + type
import { INTERESTS } from "../../shared/constants/interests";
import type { UserProfileToShow, UserProfileOnReceive } from "../../shared/types";
import { LikeButton } from "../../shared/components/LikeButton";
import { HeartAnimation } from "../../shared/components/HeartAnimation";
import { MoreVertical } from "lucide-react";
import { calculateAge } from "../../shared/utils/age";
// import { Minus } from "lucide-react";
import { createLucideIcon } from "lucide-react";

export const DashWide = createLucideIcon("DashWide", [
  ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }]
]);

// Map API -> UI type
function mapUserProfile(data: UserProfileOnReceive): UserProfileToShow {
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    dateOfBirth: (data as any).dateOfBirth || (data as any).dateofbirth,
    gender: data.gender,
    bio: data.bio,
    avataar: data.avataar
      ? `https://r2-image-proxy.files-tu-dating-app.workers.dev/${data.avataar}`
      : "/profile_placeholder.jpg",
    preferred_gender: data.preferred_gender,
    school_name: data.school_name,
    programme_name: data.programme_name,
    department_name: data.department_name,
    personality: data.personality,
    looking_for: data.looking_for,
    interests: data.interests
      .map((id: number) => {
        const match = INTERESTS.find((i) => i.id === id);
        return match ? match.name : null;
      })
      .filter((name): name is string => name !== null),
    has_liked: false,
    is_blocked: false,
    has_blocked: false, // ← controls Block/Unblock label
    posts: [],
  };
}

// Direction-aware, Tinder-like variants
const cardVariants: Variants = {
  enter: (dir: number) => ({
    x: dir === 1 ? 60 : -60,
    rotate: dir === 1 ? 3 : -3,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 22 },
  },
  exit: (dir: number) => ({
    x: dir === 1 ? -380 : 380, // leaving direction matches swipe
    rotate: dir === 1 ? -10 : 10,
    opacity: 0,
    scale: 0.98,
    transition: { type: "spring" as const, stiffness: 280, damping: 26 },
  }),
};

// Bottom sheet variants
const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 40 },
  },
  exit: {
    y: "100%",
    transition: { type: "spring", stiffness: 380, damping: 40 },
  },
};

export default function FeedMobile() {
  const [profiles, setProfiles] = useState<UserProfileToShow[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = next (left swipe), -1 = previous (right swipe)

  // bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  // modal now supports unblock too
  const [modal, setModal] = useState<null | "block" | "unblock" | "report">(null);
  // in-flight state for block/unblock
  const [relationBusy, setRelationBusy] = useState(false);

  // --- report form state (new) ---
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const resetReportState = () => {
    setReportReason(null);
    setReportDetails("");
    setReportBusy(false);
  };

  // --- image loading overlay state (NEW) ---
  const [imageLoading, setImageLoading] = useState(true);
  useEffect(() => {
    // whenever we switch cards, show the loading overlay until <img> resolves
    setImageLoading(true);
  }, [currentIndex]);

  useEffect(() => {
    (async () => {
      try {
        const data: UserProfileOnReceive[] = await getRandomProfiles();
        setProfiles(data.map(mapUserProfile));
      } catch (err) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLike = async (profileId: string) => {
    try {
      setShowHeart(true); // center heart overlay
      await setLike({ likes: [profileId] });
      setProfiles((prev) =>
        prev.map((p, i) => (i === currentIndex ? { ...p, has_liked: true } : p))
      );
      setTimeout(() => setShowHeart(false), 1200);
    } catch (err) {
      console.error("Error liking profile", err);
    }
  };

  const handleBlock = async (uid: string) => {
    setRelationBusy(true);
    try {
      await setBlock({ blocks: [uid] });
      setProfiles((prev) =>
        prev.map((p, i) => (i === currentIndex ? { ...p, has_blocked: true } : p))
      );
      setModal(null);
    } catch (err) {
      console.error("Error blocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };

  const handleUnblock = async (uid: string) => {
    setRelationBusy(true);
    try {
      await setUnblock({ unblocks: [uid] });
      setProfiles((prev) =>
        prev.map((p, i) => (i === currentIndex ? { ...p, has_blocked: false } : p))
      );
      setModal(null);
    } catch (err) {
      console.error("Error unblocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };

  const nextProfile = () => {
    setDirection(1);
    setCurrentIndex((prev) => Math.min(prev + 1, profiles.length)); // handle "no more" below
  };
  const prevProfile = () => {
    setDirection(-1);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  // ---------------------------
  // Loading state
  // ---------------------------
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
        Loading profiles...
      </div>
    );
  }

  // ---------------------------
  // No-more-profiles "card"
  // ---------------------------
  if (currentIndex >= profiles.length) {
    return (
      <div className="relative flex flex-col items-center justify-center min-w-full min-h-screen overflow-x-hidden overflow-y-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key="no-more-card"
            className="relative w-full"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 250, damping: 22 } }}
            exit={{ opacity: 0, y: -30, scale: 0.98, transition: { type: "spring", stiffness: 250, damping: 22 } }}
            drag="x"
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={(_, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * 0.7 + Math.abs(velocity.x) * 0.2;
              if (offset.x > 80 || (offset.x > 40 && swipe > 100)) {
                // allow swipe RIGHT -> go back
                prevProfile();
              }
              // otherwise do nothing (snap back)
            }}
            whileDrag={{ rotate: 2, scale: 0.995 }}
          >
            {/* top illustration at fixed ratio like other cards */}
            <div className="relative w-full aspect-[3.3] overflow-hidden rounded-t-[1.25rem]">
              <img
                src="/nomoreprofiles_undraw.png"
                alt="No more profiles illustration"
                className="absolute inset-[0rem] w-full h-full object-contain bg-[#0D0002]"
              />
            </div>

            {/* details card */}
            <div className="relative -mt-[1.2rem] bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] pb-[1.25rem] text-center">
              <h2 className="text-[1.8rem] font-semibold">No more profiles to show!</h2>
              <p className="mt-[0.8rem] text-white/80 text-[1.05rem] leading-relaxed">
                The platform is still in its early stage,<br />
                stay tuned for more profiles to show up!
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ---------------------------
  // Normal profile card
  // ---------------------------
  const profile = profiles[currentIndex];

  return (
    <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={profile.uid}
          className="relative w-full"
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x"
          dragElastic={0.2}
          dragMomentum={false}
          onDragEnd={(_, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * 0.7 + Math.abs(velocity.x) * 0.2;
            if (offset.x < -100 || (offset.x < -40 && swipe > 100)) {
              nextProfile(); // left → next
            } else if (offset.x > 100 || (offset.x > 40 && swipe > 100)) {
              prevProfile(); // right → prev
            }
          }}
          whileDrag={{ rotate: direction === 1 ? -2 : 2, scale: 0.995 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {/* ===== Sticky top block: Avatar + Header (name + like) ===== */}
          <div className="sticky top-0 z-10">
            {/* IMAGE: fixed viewport with aspect ratio 0.8, rounded top corners */}
            <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">
              {/* 3-dot menu triggers bottom sheet */}
              <button
                onClick={() => setSheetOpen(true)}
                className="absolute top-[1.25rem] right-[0.75rem] border-none bg-[#82817c]/50 py-[0.25rem] rounded-full z-[5]"
              >
                <MoreVertical className="w-full text-white" />
              </button>

              {/* Heart animation overlay (CENTERED) */}
              {showHeart && (
                <div className="absolute inset-[0rem] z-[4] flex items-center justify-center pointer-events-none">
                  <HeartAnimation trigger={showHeart} size={200} />
                </div>
              )}

              {/* NEW: Loading overlay image while the avatar loads */}
              {imageLoading && (
                <img
                  src="/profile_loading.png"
                  alt="Loading avatar"
                  className="absolute inset-0 w-full h-full object-cover z-[2]"
                />
              )}

              {/* actual photo (fades in when loaded) */}
              <img
                src={profile.avataar || "/profile_placeholder.jpg"}
                alt={profile.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
                  setImageLoading(false);
                }}
              />
            </div>

            {/* Header row sitting on the overlapping sheet */}
            <div className="relative -mt-[1.2rem] ">
              <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] ">
                <div className="flex items-center justify-between">
                  <h2 className="text-[1.5rem] mx-[1rem] font-bold leading-tight">{profile.name}</h2>
                  <LikeButton liked={profile.has_liked} onToggle={() => handleLike(profile.uid)} />
                </div>
              </div>
            </div>
          </div>

          {/* ===== Scrollable details (behind sticky header) ===== */}
          <div className="bg-[#0D0002] px-[2rem] pb-[1.25rem]">
            <p className="text-[0.95rem] text-white/70">
              {calculateAge(profile.dateOfBirth)} {profile.gender}, {profile.personality}
            </p>

            {/* interests */}
            <div className="mt-[0.6rem] flex flex-wrap">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-[8px] py-[5px] mx-[3px] my-[3px] text-xs rounded-full bg-[#FF5069]"
                >
                  {interest}
                </span>
              ))}
            </div>

            <h3 className="mt-[0.8rem] text-[1.25rem] font-semibold">About me</h3>
            <p className="mt-[0.4rem] text-gray-300 text-[0.95rem] leading-relaxed">
              {profile.bio}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ===== Bottom Sheet: Block / Report ===== */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* backdrop */}
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => setSheetOpen(false)}
              className="fixed inset-[0rem] z-[60] bg-[transparent] border-none "
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* sheet */}
            <motion.div
              className="fixed left-[0rem] right-[0rem] bottom-[0rem] z-[61]"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60) setSheetOpen(false);
              }}
            >
              <div className="bg-[#121212] flex flex-col justify-center item-center rounded-t-[1.25rem] px-[1rem] pb-[1rem]">
                {/* grabber */}
                <div className="w-full flex justify-center"><DashWide style={{ width: "10rem", height: "3rem", color:"white", padding:"0rem" }} strokeWidth={2.5} /></div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />
                <button
                  className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white"
                  onClick={() => {
                    setSheetOpen(false);
                    setModal(profile.has_blocked ? "unblock" : "block");
                  }}
                >
                  {profile.has_blocked ? "Unblock user" : "Block user"}
                </button>
                <div className="h-[1px] bg-white/10" />
                <button
                  className="w-full text-left bg-[transparent] border-none text-[1.05rem] py-[0.9rem] text-white"
                  onClick={() => {
                    setSheetOpen(false);
                    setModal("report");
                  }}
                >
                  Report account
                </button>
                {/* Safe area padding */}
                <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Center Modal: Block / Unblock + Report ===== */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.button
              type="button"
              aria-label="Close modal"
              onClick={() => (relationBusy || reportBusy ? null : (resetReportState(), setModal(null)))}
              className="fixed inset-0 z-[70] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[22rem] rounded-[1rem] bg-[#1a1a1a] p-[1rem] text-white"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 26 } }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {modal === "report" ? (
                <>
                  <h3 className="text-[1.25rem] font-semibold mb-[0.4rem]">Report {profile.name}</h3>
                  <p className="text-white/80 text-[1rem] mb-[0.9rem]">
                    Choose a reason and (optionally) add details for our review team.
                  </p>

                  <div className="space-y-[0.6rem] mb-[0.8rem]">
                    {(["Cyberbullying or abuse", "Spam or misleading content", "Other"] as ReportReason[]).map((label) => (
                      <label
                        key={label}
                        className="flex items-center gap-[0.6rem] px-[0.8rem] py-[0.7rem] rounded-[0.7rem] bg-white/5 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          className="accent-[#FF5069]"
                          checked={reportReason === label}
                          onChange={() => setReportReason(label)}
                        />
                        <span className="text-[0.98rem]">{label}</span>
                      </label>
                    ))}
                  </div>

                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Additional information"
                    rows={3}
                    className="w-[18.8rem] rounded-[0.7rem] bg-white/5 text-white p-[0.75rem] text-[0.95rem] placeholder-white/40 outline-none mb-[0.9rem]"
                  />

                  <div className="flex justify-center w-full gap-[0.6rem]">
                    <div className="w-[6rem]">
                      <button
                        className="px-[0.9rem] py-[0.5rem] mb-[0.8rem] rounded-[0.6rem] w-full border-none bg-[#FF5069] text-white disabled:opacity-60"
                        disabled={!reportReason || reportBusy}
                        onClick={async () => {
                          if (!reportReason) return;
                          try {
                            setReportBusy(true);
                            await submitUserReport({
                              reportedUid: profile.uid,
                              reportedName: profile.name,
                              reportedEmail: profile.email ?? null,
                              reason: reportReason,
                              details: reportDetails,
                            });
                            resetReportState();
                            setModal(null);
                          } catch (e) {
                            console.error("report submit failed", e);
                            setReportBusy(false);
                          }
                        }}
                      >
                        {reportBusy ? "Reporting..." : "Report"}
                      </button>
                      <button
                        className="px-[0.9rem] py-[0.5rem] w-full border-none rounded-[0.6rem] bg-white/10"
                        onClick={() => {
                          resetReportState();
                          setModal(null);
                        }}
                        disabled={reportBusy}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center mt-[2rem]">
                    <img
                      src="/blockuser_undraw.png"
                      alt="image loading..."
                      className="w-[6rem] h-auto opacity-80"
                    />
                  </div>
                  <h3 className="text-[1.25rem] font-semibold mb-[0.6rem]">
                    {modal === "block" ? `Block ${profile.name}?` : `Unblock ${profile.name}?`}
                  </h3>
                  {modal === "block" ? (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
                      Blocked users will not appear in your algorithms and they cannot see your
                      account details. Chatting will be disabled until you manually unblock.
                    </p>
                  ) : (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
                      They will start appearing again in algorithms and can see your public
                      details. Chatting will be enabled.
                    </p>
                  )}
                  <div className="flex flex-col justify-center items-center gap-[0.6rem]">
                    {modal === "block" ? (
                      <button
                        className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
                        onClick={() => handleBlock(profile.uid)}
                        disabled={relationBusy}
                      >
                        {relationBusy ? "Blocking..." : "Block"}
                      </button>
                    ) : (
                      <button
                        className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
                        onClick={() => handleUnblock(profile.uid)}
                        disabled={relationBusy}
                      >
                        {relationBusy ? "Unblocking..." : "Unblock"}
                      </button>
                    )}

                    <button
                      className="px-[0.9rem] py-[0.5rem] mt-[0.75rem] w-[6.6rem] border-none rounded-[0.6rem] bg-white/10 disabled:opacity-60"
                      onClick={() => setModal(null)}
                      disabled={relationBusy}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// // src/mobile/pages/FeedMobile.tsx
// "use client";
// import { useEffect, useState } from "react";
// import { motion, AnimatePresence, type Variants } from "framer-motion";
// import { getRandomProfiles, setLike, setBlock, setUnblock, submitUserReport, type ReportReason } from "../../shared/api"; // ⬅ added submitUserReport + type
// import { INTERESTS } from "../../shared/constants/interests";
// import type { UserProfileToShow, UserProfileOnReceive } from "../../shared/types";
// import { LikeButton } from "../../shared/components/LikeButton";
// import { HeartAnimation } from "../../shared/components/HeartAnimation";
// import { MoreVertical } from "lucide-react";
// import { calculateAge } from "../../shared/utils/age";
// import { Minus } from "lucide-react";
// import { createLucideIcon } from "lucide-react";

// export const DashWide = createLucideIcon("DashWide", [
//   ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }]
// ]);


// // Map API -> UI type
// function mapUserProfile(data: UserProfileOnReceive): UserProfileToShow {
//   return {
//     uid: data.uid,
//     name: data.name,
//     email: data.email,
//     dateOfBirth: (data as any).dateOfBirth || (data as any).dateofbirth,
//     gender: data.gender,
//     bio: data.bio,
//     avataar: data.avataar
//       ? `https://r2-image-proxy.files-tu-dating-app.workers.dev/${data.avataar}`
//       : "/profile_placeholder.jpg",
//     preferred_gender: data.preferred_gender,
//     school_name: data.school_name,
//     programme_name: data.programme_name,
//     department_name: data.department_name,
//     personality: data.personality,
//     looking_for: data.looking_for,
//     interests: data.interests
//       .map((id: number) => {
//         const match = INTERESTS.find((i) => i.id === id);
//         return match ? match.name : null;
//       })
//       .filter((name): name is string => name !== null),
//     has_liked: false,
//     is_blocked: false,
//     has_blocked: false, // ← controls Block/Unblock label
//     posts: [],
//   };
// }

// // Direction-aware, Tinder-like variants
// const cardVariants: Variants = {
//   enter: (dir: number) => ({
//     x: dir === 1 ? 60 : -60,
//     rotate: dir === 1 ? 3 : -3,
//     opacity: 0,
//     scale: 0.98,
//   }),
//   center: {
//     x: 0,
//     rotate: 0,
//     opacity: 1,
//     scale: 1,
//     transition: { type: "spring" as const, stiffness: 260, damping: 22 },
//   },
//   exit: (dir: number) => ({
//     x: dir === 1 ? -380 : 380, // leaving direction matches swipe
//     rotate: dir === 1 ? -10 : 10,
//     opacity: 0,
//     scale: 0.98,
//     transition: { type: "spring" as const, stiffness: 280, damping: 26 },
//   }),
// };

// // Bottom sheet variants
// const sheetVariants: Variants = {
//   hidden: { y: "100%" },
//   visible: {
//     y: 0,
//     transition: { type: "spring", stiffness: 380, damping: 40 },
//   },
//   exit: {
//     y: "100%",
//     transition: { type: "spring", stiffness: 380, damping: 40 },
//   },
// };

// export default function FeedMobile() {
//   const [profiles, setProfiles] = useState<UserProfileToShow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [showHeart, setShowHeart] = useState(false);
//   const [direction, setDirection] = useState<1 | -1>(1); // 1 = going to next (left swipe), -1 = previous (right swipe)

//   // bottom sheet state
//   const [sheetOpen, setSheetOpen] = useState(false);
//   // modal now supports unblock too
//   const [modal, setModal] = useState<null | "block" | "unblock" | "report">(null);
//   // in-flight state for block/unblock
//   const [relationBusy, setRelationBusy] = useState(false);

//   // --- report form state (new) ---
//   const [reportReason, setReportReason] = useState<ReportReason | null>(null);
//   const [reportDetails, setReportDetails] = useState("");
//   const [reportBusy, setReportBusy] = useState(false);
//   const resetReportState = () => {
//     setReportReason(null);
//     setReportDetails("");
//     setReportBusy(false);
//   };

//   useEffect(() => {
//     (async () => {
//       try {
//         const data: UserProfileOnReceive[] = await getRandomProfiles();
//         setProfiles(data.map(mapUserProfile));
//       } catch (err) {
//         console.error("Error fetching profiles:", err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   const handleLike = async (profileId: string) => {
//     try {
//       setShowHeart(true); // center heart overlay
//       await setLike({ likes: [profileId] });
//       setProfiles((prev) =>
//         prev.map((p, i) => (i === currentIndex ? { ...p, has_liked: true } : p))
//       );
//       setTimeout(() => setShowHeart(false), 1200);
//     } catch (err) {
//       console.error("Error liking profile", err);
//     }
//   };

//   // --- ONLY NEW LOGIC BELOW ---

//   const handleBlock = async (uid: string) => {
//     setRelationBusy(true);
//     try {
//       await setBlock({ blocks: [uid] });
//       setProfiles((prev) =>
//         prev.map((p, i) => (i === currentIndex ? { ...p, has_blocked: true } : p))
//       );
//       setModal(null);
//     } catch (err) {
//       console.error("Error blocking user", err);
//     } finally {
//       setRelationBusy(false);
//     }
//   };

//   const handleUnblock = async (uid: string) => {
//     setRelationBusy(true);
//     try {
//       await setUnblock({ unblocks: [uid] });
//       setProfiles((prev) =>
//         prev.map((p, i) => (i === currentIndex ? { ...p, has_blocked: false } : p))
//       );
//       setModal(null);
//     } catch (err) {
//       console.error("Error unblocking user", err);
//     } finally {
//       setRelationBusy(false);
//     }
//   };

//   const nextProfile = () => {
//     setDirection(1);
//     setCurrentIndex((prev) => Math.min(prev + 1, profiles.length)); // handle "no more" below
//   };
//   const prevProfile = () => {
//     setDirection(-1);
//     setCurrentIndex((prev) => Math.max(prev - 1, 0));
//   };

//   // ---------------------------
//   // Loading state
//   // ---------------------------
//   if (loading) {
//     return (
//       <div className="flex flex-col justify-center items-center h-full text-gray-300 pb-20">
//         Loading profiles...
//       </div>
//     );
//   }

//   // ---------------------------
//   // No-more-profiles "card"
//   // ---------------------------
//   if (currentIndex >= profiles.length) {
//     return (
//       <div className="relative flex flex-col items-center justify-center min-w-full min-h-screen overflow-x-hidden overflow-y-hidden">
//         <AnimatePresence mode="wait">
//           <motion.div
//             key="no-more-card"
//             className="relative w-full"
//             initial={{ opacity: 0, y: 30, scale: 0.98 }}
//             animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 250, damping: 22 } }}
//             exit={{ opacity: 0, y: -30, scale: 0.98, transition: { type: "spring", stiffness: 250, damping: 22 } }}
//             drag="x"
//             dragElastic={0.2}
//             dragMomentum={false}
//             onDragEnd={(_, { offset, velocity }) => {
//               const swipe = Math.abs(offset.x) * 0.7 + Math.abs(velocity.x) * 0.2;
//               if (offset.x > 80 || (offset.x > 40 && swipe > 100)) {
//                 // allow swipe RIGHT -> go back
//                 prevProfile();
//               }
//               // otherwise do nothing (snap back)
//             }}
//             whileDrag={{ rotate: 2, scale: 0.995 }}
//           >
//             {/* top illustration at fixed ratio like other cards */}
//             <div className="relative w-full aspect-[3.3] overflow-hidden rounded-t-[1.25rem]">
//               <img
//                 src="/nomoreprofiles_undraw.png"
//                 alt="No more profiles illustration"
//                 className="absolute inset-[0rem] w-full h-full object-contain bg-[#0D0002]"
//               />
//             </div>

//             {/* details card */}
//             <div className="relative -mt-[1.2rem] bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] pb-[1.25rem] text-center">
//               <h2 className="text-[1.8rem] font-semibold">No more profiles to show!</h2>
//               <p className="mt-[0.8rem] text-white/80 text-[1.05rem] leading-relaxed">
//                 The platform is still in its early stage,<br />
//                 stay tuned for more profiles to show up!
//               </p>
//             </div>
//           </motion.div>
//         </AnimatePresence>
//       </div>
//     );
//   }

//   // ---------------------------
//   // Normal profile card
//   // ---------------------------
//   const profile = profiles[currentIndex];

//   return (
//     <div className="relative flex flex-col items-center min-w-full min-h-screen overflow-x-hidden overflow-y-auto">
//       <AnimatePresence mode="wait" custom={direction}>
//         <motion.div
//           key={profile.uid}
//           className="relative w-full"
//           custom={direction}
//           variants={cardVariants}
//           initial="enter"
//           animate="center"
//           exit="exit"
//           drag="x"
//           dragElastic={0.2}
//           dragMomentum={false}
//           onDragEnd={(_, { offset, velocity }) => {
//             const swipe = Math.abs(offset.x) * 0.7 + Math.abs(velocity.x) * 0.2;
//             if (offset.x < -100 || (offset.x < -40 && swipe > 100)) {
//               nextProfile(); // left → next
//             } else if (offset.x > 100 || (offset.x > 40 && swipe > 100)) {
//               prevProfile(); // right → prev
//             }
//           }}
//           whileDrag={{ rotate: direction === 1 ? -2 : 2, scale: 0.995 }}
//           transition={{ type: "spring", stiffness: 260, damping: 22 }}
//         >
//           {/* ===== Sticky top block: Avatar + Header (name + like) ===== */}
//           <div className="sticky top-0 z-10">
//             {/* IMAGE: fixed viewport with aspect ratio 0.8, rounded top corners */}
//             <div className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]">
//               {/* 3-dot menu triggers bottom sheet */}
//               <button
//                 onClick={() => setSheetOpen(true)}
//                 className="absolute top-[1.25rem] right-[0.75rem] border-none bg-[#82817c]/50 py-[0.25rem] rounded-full z-[5]"
//               >
//                 <MoreVertical className="w-full text-white" />
//               </button>

//               {/* Heart animation overlay (CENTERED) */}
//               {showHeart && (
//                 <div className="absolute inset-[0rem] z-[4] flex items-center justify-center pointer-events-none">
//                   <HeartAnimation trigger={showHeart} size={200} />
//                 </div>
//               )}

//               {/* actual photo */}
//               <img
//                 src={profile.avataar || "/profile_placeholder.jpg"}
//                 alt={profile.name}
//                 className="absolute inset-0 w-full h-full object-cover"
//                 onError={(e) => {
//                   (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
//                 }}
//               />
//             </div>

//             {/* Header row sitting on the overlapping sheet */}
//             <div className="relative -mt-[1.2rem] ">
//               <div className="bg-[#0D0002] rounded-t-[1.5rem] px={[1 as any]} pt-[1.1rem] pb-[0.6rem]">
//                 <div className="flex items-center justify-between">
//                   <h2 className="text-[1.8rem] mx-[1rem] font-bold leading-tight">{profile.name}</h2>
//                   <LikeButton liked={profile.has_liked} onToggle={() => handleLike(profile.uid)} />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== Scrollable details (behind sticky header) ===== */}
//           <div className="bg-[#0D0002] px-[2rem] pt-[0.6rem] pb-[1.25rem]">
//             <p className="text-[0.95rem] text-white/70">
//               {calculateAge(profile.dateOfBirth)} {profile.gender}, {profile.personality}
//             </p>

//             {/* interests */}
//             <div className="mt-[0.6rem] flex flex-wrap">
//               {profile.interests.map((interest) => (
//                 <span
//                   key={interest}
//                   className="px-[8px] py-[5px] mx-[3px] my-[3px] text-xs rounded-full bg-[#FF5069]"
//                 >
//                   {interest}
//                 </span>
//               ))}
//             </div>

//             <h3 className="mt-[0.8rem] text-[1.25rem] font-semibold">About me</h3>
//             <p className="mt-[0.4rem] text-gray-300 text-[0.95rem] leading-relaxed">
//               {profile.bio}
//             </p>
//           </div>
//         </motion.div>
//       </AnimatePresence>

//       {/* ===== Bottom Sheet: Block / Report ===== */}
//       <AnimatePresence>
//         {sheetOpen && (
//           <>
//             {/* backdrop */}
//             <motion.button
//               type="button"
//               aria-label="Close"
//               onClick={() => setSheetOpen(false)}
//               className="fixed inset-[0rem] z-[60] bg-[transparent] border-none "
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//             />
//             {/* sheet */}
//             <motion.div
//               className="fixed left-[0rem] right-[0rem] bottom-[0rem] z-[61]"
//               variants={sheetVariants}
//               initial="hidden"
//               animate="visible"
//               exit="exit"
//               drag="y"
//               dragConstraints={{ top: 0, bottom: 0 }}
//               dragElastic={0.1}
//               onDragEnd={(_, info) => {
//                 if (info.offset.y > 60) setSheetOpen(false);
//               }}
//             >
//               <div className="bg-[#121212] flex flex-col justify-center item-center rounded-t-[1.25rem] px-[1rem] pb-[1rem]">
//                 {/* grabber */}
//                 <div className="w-full flex justify-center"><DashWide style={{ width: "10rem", height: "3rem", color: "white", padding:"0rem" }} strokeWidth={2.5} />
//                 </div>
//                 <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />
//                 <button
//                   className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white"
//                   onClick={() => {
//                     setSheetOpen(false);
//                     setModal(profile.has_blocked ? "unblock" : "block"); // ⬅ dynamic
//                   }}
//                 >
//                   {profile.has_blocked ? "Unblock user" : "Block user"}
//                 </button>
//                 <div className="h-[1px] bg-white/10" />
//                 <button
//                   className="w-full text-left bg-[transparent] border-none text-[1.05rem] py-[0.9rem] text-white"
//                   onClick={() => {
//                     setSheetOpen(false);
//                     setModal("report");
//                   }}
//                 >
//                   Report account
//                 </button>
//                 {/* Safe area padding */}
//                 <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
//               </div>
//             </motion.div>
//           </>
//         )}
//       </AnimatePresence>

//       {/* ===== Center Modal: Block / Unblock + Report ===== */}
//       <AnimatePresence>
//         {modal && (
//           <>
//             <motion.button
//               type="button"
//               aria-label="Close modal"
//               onClick={() => (relationBusy || reportBusy ? null : (resetReportState(), setModal(null)))}
//               className="fixed inset-0 z-[70] bg-black/60"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//             />
//             <motion.div
//               className="fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[22rem] rounded-[1rem] bg-[#1a1a1a] p-[1rem] text-white"
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 26 } }}
//               exit={{ scale: 0.9, opacity: 0 }}
//             >
//               {modal === "report" ? (
//                 <>
//                   <h3 className="text-[1.25rem] font-semibold mb-[0.4rem]">Report {profile.name}</h3>
//                   <p className="text-white/80 text-[1rem] mb-[0.9rem]">
//                     Choose a reason and (optionally) add details for our review team.
//                   </p>

//                   {/* radio list — labels match your Android UI */}
//                   <div className="space-y-[0.6rem] mb-[0.8rem]">
//                     {(["Cyberbullying or abuse", "Spam or misleading content", "Other"] as ReportReason[]).map((label) => (
//                       <label
//                         key={label}
//                         className="flex items-center gap-[0.6rem] px-[0.8rem] py-[0.7rem] rounded-[0.7rem] bg-white/5 cursor-pointer"
//                       >
//                         <input
//                           type="radio"
//                           name="report-reason"
//                           className="accent-[#FF5069]"
//                           checked={reportReason === label}
//                           onChange={() => setReportReason(label)}
//                         />
//                         <span className="text-[0.98rem]">{label}</span>
//                       </label>
//                     ))}
//                   </div>

//                   {/* additional info textbox */}
//                   <textarea
//                     value={reportDetails}
//                     onChange={(e) => setReportDetails(e.target.value)}
//                     placeholder="Additional information"
//                     rows={3}
//                     className="w-[18.8rem] rounded-[0.7rem] bg-white/5 text-white p-[0.75rem] text-[0.95rem] placeholder-white/40 outline-none mb-[0.9rem]"
//                   />

//                   {/* actions */}
//                   <div className="flex justify-center w-full gap-[0.6rem]">

//                     <div className="w-[6rem]">
//                       <button
//                         className="px-[0.9rem] py-[0.5rem] mb-[0.8rem] rounded-[0.6rem] w-full border-none bg-[#FF5069] text-white disabled:opacity-60"
//                         disabled={!reportReason || reportBusy}
//                         onClick={async () => {
//                           if (!reportReason) return;
//                           try {
//                             setReportBusy(true);
//                             await submitUserReport({
//                               reportedUid: profile.uid,
//                               reportedName: profile.name,
//                               reportedEmail: profile.email ?? null,
//                               reason: reportReason,
//                               details: reportDetails,
//                             });
//                             resetReportState();
//                             setModal(null);
//                           } catch (e) {
//                             console.error("report submit failed", e);
//                             setReportBusy(false);
//                           }
//                         }}
//                       >
//                         {reportBusy ? "Reporting..." : "Report"}
//                       </button>
//                       <button
//                         className="px-[0.9rem] py-[0.5rem] w-full border-none rounded-[0.6rem] bg-white/10"
//                         onClick={() => {
//                           resetReportState();
//                           setModal(null);
//                         }}
//                         disabled={reportBusy}
//                       >
//                         Cancel
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="flex flex-col items-center justify-center mt-[2rem]">
//                     <img
//                       src="/blockuser_undraw.png"
//                       alt="image loading..."
//                       className="w-[6rem] h-auto opacity-80"
//                     />
//                   </div>
//                   <h3 className="text-[1.25rem] font-semibold mb-[0.6rem]">
//                     {modal === "block" ? `Block ${profile.name}?` : `Unblock ${profile.name}?`}
//                   </h3>
//                   {modal === "block" ? (
//                     <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
//                       Blocked users will not appear in your algorithms and they cannot see your
//                       account details. Chatting will be disabled until you manually unblock.
//                     </p>
//                   ) : (
//                     <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
//                       They will start appearing again in algorithms and can see your public
//                       details. Chatting will be enabled.
//                     </p>
//                   )}
//                   <div className="flex flex-col justify-center items-center gap-[0.6rem]">

//                     {modal === "block" ? (
//                       <button
//                         className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
//                         onClick={() => handleBlock(profile.uid)}
//                         disabled={relationBusy}
//                       >
//                         {relationBusy ? "Blocking..." : "Block"}
//                       </button>
//                     ) : (
//                       <button
//                         className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
//                         onClick={() => handleUnblock(profile.uid)}
//                         disabled={relationBusy}
//                       >
//                         {relationBusy ? "Unblocking..." : "Unblock"}
//                       </button>
//                     )}

//                     <button
//                       className="px-[0.9rem] py-[0.5rem] mt-[0.75rem] w-[6.6rem] border-none rounded-[0.6rem] bg-white/10 disabled:opacity-60"
//                       onClick={() => setModal(null)}
//                       disabled={relationBusy}
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </>
//               )}
//             </motion.div>
//           </>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
