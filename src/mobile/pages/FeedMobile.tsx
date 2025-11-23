// src/mobile/pages/FeedMobile.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  getRandomProfiles,
  setLike,
  setBlock,
  setUnblock,
  submitUserReport,
  type ReportReason,
  getPosts as apiGetPosts,
} from "../../shared/api";
import { INTERESTS } from "../../shared/constants/interests";
import type { UserProfileToShow, UserProfileOnReceive } from "../../shared/types";
import { LikeButton } from "../../shared/components/LikeButton";
import { HeartAnimation } from "../../shared/components/HeartAnimation";
import { MoreVertical } from "lucide-react";
import { calculateAge } from "../../shared/utils/age";
import { createLucideIcon } from "lucide-react";
import LoadingScreen from "../../shared/components/LoadingScreen";

export const DashWide = createLucideIcon("DashWide", [
  ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }],
]);

/* ---------------- WORKER BASE (same as Profile) ---------------- */
const WORKER_BASE = "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

/* ---------------- UTIL: stable post URL builder ---------------- */
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

/* ---------------- LOOKING FOR MAP ----------------
   adjust values if your backend uses different codes */
const LOOKING_FOR_MAP: Record<number, string> = {
  0: "Dating and vibing",
  1: "Long-term commitment",
  2: "Something casual",
  3: "I’m not sure"
};

/* ---------------- Extract join year from email ---------------- */
function extractJoinYear(email?: string | null) {
  if (!email) return null;
  const prefix = email.split("@")[0] || "";
  const m = prefix.match(/(\d{2})/);
  if (m && m[1]) {
    return Number("20" + m[1]);
  }
  return null;
}

/* ---------------- Types ---------------- */
type UserPost = {
  id: number;
  user_id: number;
  picture: string;
  caption: string;
  posted_on: string;
  workerUrl?: string;
};

// Map API -> UI type (keeps existing behavior but uses WORKER_BASE)
function mapUserProfile(data: UserProfileOnReceive): UserProfileToShow {
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    dateOfBirth: (data as any).dateOfBirth || (data as any).dateofbirth,
    gender: data.gender,
    bio: data.bio,
    avataar: data.avataar ? `${WORKER_BASE}${data.avataar}` : "/profile_placeholder.jpg",
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

/* ---------------- Anim variants (unchanged) ---------------- */
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
    x: dir === 1 ? -380 : 380,
    rotate: dir === 1 ? -10 : 10,
    opacity: 0,
    scale: 0.98,
    transition: { type: "spring" as const, stiffness: 280, damping: 26 },
  }),
};

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

  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);


  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [modal, setModal] = useState<null | "block" | "unblock" | "report">(null);
  const [relationBusy, setRelationBusy] = useState(false);

  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const resetReportState = () => {
    setReportReason(null);
    setReportDetails("");
    setReportBusy(false);
  };

  // image loading overlay for main avatar
  const [imageLoading, setImageLoading] = useState(true);

  // posts for the currently visible profile (fetched via posts/all?target=uid)
  const [postsForProfile, setPostsForProfile] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postImageStatus, setPostImageStatus] = useState<Record<number, "loading" | "loaded" | "error">>({});

  // avatar swap states when clicking a post (same UX as Profile page)
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [prevAvatarUrl, setPrevAvatarUrl] = useState<string | null>(null);

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

  useEffect(() => {
    // whenever we switch cards, show the loading overlay until <img> resolves
    setImageLoading(true);
  }, [currentIndex]);

  // fetch posts for the visible profile whenever currentIndex or profiles change
  useEffect(() => {
    // If we are out of profiles, stop everything and show the "no more" card
    if (currentIndex >= profiles.length) {
      setPostsForProfile([]);
      return;
    }
  
    (async () => {
      const p = profiles[currentIndex];
      if (!p?.uid) {
        setPostsForProfile([]);
        return;
      }
  
      setPostsLoading(true);
      try {
        const res: any = await apiGetPosts(p.uid);
        const arr = Array.isArray(res) ? res : res.data ?? [];
  
        const sorted = (arr as UserPost[])
          .slice()
          .sort((a, b) => new Date(b.posted_on).getTime() - new Date(a.posted_on).getTime());
  
        const stablePosts = sorted.map((pst) => ({
          ...pst,
          workerUrl: toWorkerPostUrlClean(pst.picture),
        }));
  
        setPostsForProfile(stablePosts);
        setPostImageStatus({});
      } catch (err) {
        console.error("Error fetching posts for profile:", err);
        setPostsForProfile([]);
      } finally {
        setPostsLoading(false);
      }
    })();
  }, [currentIndex, profiles]);
  

  const handleLike = async (profileId: string): Promise<boolean> => {
    // trigger big heart exactly like double tap
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
    try {
      await setLike({ likes: [profileId] });
  
      setProfiles((prev) =>
        prev.map((p, i) =>
          i === currentIndex ? { ...p, has_liked: true } : p
        )
      );
      
      // ⭐ AUTO NEXT after liking
    setTimeout(() => {
      if (currentIndex < profiles.length - 1) {
        setDirection(1);
        setCurrentIndex(i => i + 1);
      }
    }, 200); // Play animation first

      return true;   // IMPORTANT 👍 success
    } catch (err) {
      console.error("Error liking profile", err);
      return false;  // IMPORTANT 👎 rollback
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

  const handleDoubleTap = async () => {
    const now = Date.now();
  
    if (now - lastTapRef.current < 250) {
      // DOUBLE TAP detected
  
      if (!profile.has_liked) {
        // trigger heart animation
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);

  
        // call LikeButton's logic indirectly
        const success = await handleLike(profile.uid);
  
        if (success) {
          // update UI instantly
          setProfiles((prev) =>
            prev.map((p, i) =>
              i === currentIndex ? { ...p, has_liked: true } : p
            )
          );
        }
      }
    }
  
    lastTapRef.current = now;
  };
  
  const nextProfile = () => {
  setDirection(1);
  setCurrentIndex((prev) => prev + 1);   // allow going to length
};

const prevProfile = () => {
  setDirection(-1);
  setCurrentIndex((prev) => Math.max(prev - 1, 0));
};


  // HANDLE POST CLICK: toggle avatar to post image (same logic as Profile)
  const onPostClick = (p: UserPost) => {
    const isActive = activePostId === p.id;
    if (isActive) {
      // restore avatar
      setActivePostId(null);
      if (prevAvatarUrl) {
        setImageLoading(true);
        setProfiles((prfs) =>
          prfs.map((pr, i) => (i === currentIndex ? { ...pr, avataar: prevAvatarUrl } : pr))
        );
      }
      setPrevAvatarUrl(null);
      return;
    }

    // store old avatar and switch
    setPrevAvatarUrl(profiles[currentIndex]?.avataar ?? null);
    setImageLoading(true);
    setProfiles((prfs) =>
      prfs.map((pr, i) => (i === currentIndex ? { ...pr, avataar: p.workerUrl ?? p.picture } : pr))
    );
    setActivePostId(p.id);
  };

  if (loading) {
    return <LoadingScreen />;
  }

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
                prevProfile();
              }
            }}
            whileDrag={{ rotate: 2, scale: 0.995 }}
          >
            <div className="relative w-full aspect-[3.3] overflow-hidden rounded-t-[1.25rem]">
              <img src="/nomoreprofiles_undraw.png" alt="No more profiles illustration" className="absolute inset-[0rem] w-full h-full object-contain bg-[#0D0002]" />
            </div>

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

  const profile = profiles[currentIndex];

  // derive "looking for" display text (support both numeric and string)
  const lookingForText =
    typeof profile.looking_for === "string"
      ? profile.looking_for
      : LOOKING_FOR_MAP[(profile.looking_for as unknown) as number] ?? "—";

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
              nextProfile();
            } else if (offset.x > 100 || (offset.x > 40 && swipe > 100)) {
              prevProfile();
            }
          }}
          whileDrag={{ rotate: direction === 1 ? -2 : 2, scale: 0.995 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {/* ===== Sticky top block: Avatar + Header (name + like) ===== */}
          <div className="sticky top-[0rem] z-10">
            <div 
              className="relative w-full aspect-[0.8] overflow-hidden rounded-t-[1.25rem]"
              onTouchStart={handleDoubleTap}
            
            >
              <button onClick={() => setSheetOpen(true)} className="absolute top-[1.25rem] right-[0.75rem] border-none bg-[#82817c]/50 py-[0.25rem] rounded-full z-[5]">
                <MoreVertical className="w-full text-white" />
              </button>

              {showHeart && (
                <div className="absolute inset-[0rem] z-[4] flex items-center justify-center pointer-events-none">
                  <HeartAnimation trigger={showHeart} size={200} />
                </div>
              )}

              {imageLoading && (
                <img src="/profile_loading.png" alt="Loading avatar" className="absolute inset-0 w-full h-full object-cover z-[2]" />
              )}

              <img
                src={profile.avataar || "/profile_placeholder.jpg"}
                alt={profile.name}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
                  setImageLoading(false);
                }}
              />
            </div>

            <div className="relative -mt-[1.2rem] ">
              <div className="bg-[#0D0002] rounded-t-[1.5rem] px-[1rem] pt-[1.1rem] ">
                <div className="flex items-center justify-between">
                  <h2 className="text-[1.1rem] mx-[1rem] font-bold leading-tight">{profile.name}</h2>
                  <LikeButton
                    liked={profile.has_liked}
                    onToggle={() => handleLike(profile.uid)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ===== Scrollable details (behind sticky header) ===== */}
          <div className="bg-[#0D0002] px-[2rem] pb-[1.25rem]">
            <div 
              className=""
              onTouchStart={handleDoubleTap}
            >
                {/* Age/Gender/Personality row */}
              <p className="text-[0.95rem] text-white/70">
                {calculateAge(profile.dateOfBirth)} {profile.gender}, {profile.personality}
              </p>

              {/* --- LOOKING FOR: placed directly under the age row to match screenshot --- */}
              <p className="text-[0.95rem] text-white/90 mt-[0.25rem]">
                Looking for {lookingForText}
              </p>

              {/* interests */}
              <div className="mt-[0.6rem] flex flex-wrap">
                {profile.interests.map((interest) => (
                  <span key={interest} className="px-[8px] py-[5px] mx-[3px] my-[3px] text-xs rounded-full bg-[#FF5069]">
                    {interest}
                  </span>
                ))}
              </div>

              {/* About me */}
              <h3 className="mt-[0.8rem] text-[1.25rem] font-semibold">About me</h3>
              <p className="mt-[0.4rem] text-gray-300 text-[0.95rem] leading-relaxed">
                {profile.bio}
              </p>

              {/* Education / since */}
              <div className="mt-[0.8rem]">
                <p className="mt-[0.4rem] text-[#cccccc] text-[0.95rem]">
                  {profile.programme_name || "—"},{" "}{profile.department_name || "—"},
                </p>

                <p className="text-[#cccccc] text-[0.95rem]">
                  {profile.school_name ? `School of ${profile.school_name}` : ""}
                  {(() => {
                    const y = extractJoinYear(profile.email);
                    return y ? `, since ${y}` : "";
                  })()}
                </p>
              </div>
            </div>

            {/* Posts */}
            <h2 className="mt-[1rem] text-[1.1rem] mx-[0rem] font-semibold">Posts</h2>

            {postsLoading ? (
              <p className="mx-[0rem] flex justify-center text-white/60 gap-[0.5rem] mt-[0.5rem]">
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
            ) : postsForProfile.length === 0 ? (
              <p className="mx-[0rem] flex justify-center text-white/60 mt-[0.5rem]">No posts yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-[0.35rem] mt-[0.4rem]">
                {postsForProfile.map((p) => {
                  const isActive = activePostId === p.id;
                  return (
                    <div key={p.id} onClick={() => onPostClick(p)} className="relative rounded overflow-hidden bg-black/10" style={{ aspectRatio: "1 / 1" }}>
                      <img
                        src={postImageStatus[p.id] === "error" ? "/posts_error.png" : p.workerUrl}
                        alt={p.caption}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${postImageStatus[p.id] === "loaded" ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setPostImageStatus((s) => ({ ...s, [p.id]: "loaded" }))}
                        onError={() => setPostImageStatus((s) => ({ ...s, [p.id]: "error" }))}
                      />

                      {postImageStatus[p.id] !== "loaded" && (
                        <img src="/posts_placeholder.png" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      )}

                      {isActive && (
                        <div className="absolute bg-[#0D0002]/90 inset-[0rem] flex flex-col justify-center items-center px-[0.5rem] pb-[0.5rem]">
                          <div className="text-white font-semibold" style={{ fontSize: "0.85rem", lineHeight: "1rem" }}>
                            "{p.caption}"
                          </div>

                          <div className="text-white/70 mt-[0.2rem]" style={{ fontSize: "0.65rem" }}>
                            {new Date(p.posted_on).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.button type="button" aria-label="Close" onClick={() => setSheetOpen(false)} className="fixed inset-[0rem] z-[60] bg-[transparent] border-none " initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed left-[0rem] right-[0rem] bottom-[0rem] z-[61]" variants={sheetVariants} initial="hidden" animate="visible" exit="exit" drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.1} onDragEnd={(_, info) => { if (info.offset.y > 60) setSheetOpen(false); }}>
              <div className="bg-[#121212] flex flex-col justify-center item-center rounded-t-[1.25rem] px-[1rem] pb-[1rem]">
                <div className="w-full flex justify-center"><DashWide style={{ width: "10rem", height: "3rem", color:"white", padding:"0rem" }} strokeWidth={2.5} /></div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />
                <button className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white" onClick={() => { setSheetOpen(false); setModal(profile.has_blocked ? "unblock" : "block"); }}>
                  {profile.has_blocked ? "Unblock user" : "Block user"}
                </button>
                <div className="h-[1px] bg-white/10" />
                <button className="w-full text-left bg-[transparent] border-none text-[1.05rem] py-[0.9rem] text-white" onClick={() => { setSheetOpen(false); setModal("report"); }}>
                  Report account
                </button>
                <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center modal */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.button type="button" aria-label="Close modal" onClick={() => (relationBusy || reportBusy ? null : (resetReportState(), setModal(null)))} className="fixed inset-0 z-[70] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[22rem] rounded-[1rem] bg-[#1a1a1a] p-[1rem] text-white" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 320, damping: 26 } }} exit={{ scale: 0.9, opacity: 0 }}>
              {modal === "report" ? (
                <>
                  <h3 className="text-[1.25rem] font-semibold mb-[0.4rem]">Report {profile.name}</h3>
                  <p className="text-white/80 text-[1rem] mb-[0.9rem]">Choose a reason and (optionally) add details for our review team.</p>

                  <div className="space-y-[0.6rem] mb-[0.8rem]">
                    {(["Cyberbullying or abuse", "Spam or misleading content", "Other"] as ReportReason[]).map((label) => (
                      <label key={label} className="flex items-center gap-[0.6rem] px-[0.8rem] py-[0.7rem] rounded-[0.7rem] bg-white/5 cursor-pointer">
                        <input type="radio" name="report-reason" className="accent-[#FF5069]" checked={reportReason === label} onChange={() => setReportReason(label)} />
                        <span className="text-[0.98rem]">{label}</span>
                      </label>
                    ))}
                  </div>

                  <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Additional information" rows={3} className="w-[18.8rem] rounded-[0.7rem] bg-white/5 text-white p-[0.75rem] text-[0.95rem] placeholder-white/40 outline-none mb-[0.9rem]" />

                  <div className="flex justify-center w-full gap-[0.6rem]">
                    <div className="w-[6rem]">
                      <button className="px-[0.9rem] py-[0.5rem] mb-[0.8rem] rounded-[0.6rem] w-full border-none bg-[#FF5069] text-white disabled:opacity-60" disabled={!reportReason || reportBusy} onClick={async () => {
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
                      }}>{reportBusy ? "Reporting..." : "Report"}</button>
                      <button className="px-[0.9rem] py-[0.5rem] w-full border-none rounded-[0.6rem] bg-white/10" onClick={() => { resetReportState(); setModal(null); }} disabled={reportBusy}>Cancel</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center mt-[2rem]">
                    <img src="/blockuser_undraw.png" alt="image loading..." className="w-[6rem] h-auto opacity-80" />
                  </div>
                  <h3 className="text-[1.25rem] font-semibold mb-[0.6rem]">{modal === "block" ? `Block ${profile.name}?` : `Unblock ${profile.name}?`}</h3>
                  {modal === "block" ? (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">Blocked users will not appear in your algorithms and they cannot see your account details. Chatting will be disabled until you manually unblock.</p>
                  ) : (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">They will start appearing again in algorithms and can see your public details. Chatting will be enabled.</p>
                  )}
                  <div className="flex flex-col justify-center items-center gap-[0.6rem]">
                    {modal === "block" ? (
                      <button className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60" onClick={() => handleBlock(profile.uid)} disabled={relationBusy}>{relationBusy ? "Blocking..." : "Block"}</button>
                    ) : (
                      <button className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60" onClick={() => handleUnblock(profile.uid)} disabled={relationBusy}>{relationBusy ? "Unblocking..." : "Unblock"}</button>
                    )}

                    <button className="px-[0.9rem] py-[0.5rem] mt-[0.75rem] w-[6.6rem] border-none rounded-[0.6rem] bg-white/10 disabled:opacity-60" onClick={() => setModal(null)} disabled={relationBusy}>Cancel</button>
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


