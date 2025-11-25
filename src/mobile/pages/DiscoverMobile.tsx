// src/mobile/pages/DiscoverMobile.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, Trash, MoreVertical } from "lucide-react";
import { createLucideIcon } from "lucide-react";
import Lottie from "lottie-react";

import {
  discoverSearch,
  discoverGetUserByUid,
  discoverGetFeedPosts,
  setBlock,
  setUnblock,
  submitUserReport,
  type ReportReason,
} from "../../shared/api";

import { mapUserProfile } from "../../shared/utils/mapUserProfile";
import type {
  UserProfileOnReceive,
  UserProfileToShow,
} from "../../shared/types";

import { useNavigate } from "react-router-dom";
import { PostLikeButton } from "../../shared/components/postLikeButton";

// Worker base for post images
const WORKER_BASE =
  "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

// small dash icon used in bottom sheet
export const DashWide = createLucideIcon("DashWide", [
  ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }],
]);

type DiscoverPost = {
  post_id: number;
  picture: string;
  caption: string;
  posted_on: string;

  poster_uid: string;
  poster_name: string;
  poster_avatar: string | null;
  poster_department: string | null;

  workerUrl?: string;
};

// Convert post picture to worker URL
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

//format date
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

// Simple internal debounce
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

/* ---------------- Sheet + modal variants ---------------- */
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

export default function DiscoverMobile() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [page, setPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [initialLoadingPosts, setInitialLoadingPosts] = useState(true);


  const myUidRef = useRef<string | null>(null);

  // bottom-sheet & modal states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modal, setModal] = useState<null | "block" | "unblock" | "report">(
    null
  );
  const [relationBusy, setRelationBusy] = useState(false);

  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const resetReportState = () => {
    setReportReason(null);
    setReportDetails("");
    setReportBusy(false);
  };

  // selected user for bottom-sheet actions (the post owner)
  const [selectedUser, setSelectedUser] = useState<UserProfileToShow | null>(
    null
  );

  const [openingProfile, setOpeningProfile] = useState(false);
  const [comingSoonAnim, setComingSoonAnim] = useState<any>(null);

  useEffect(() => {
    fetch("/comingsoon_lottie.json")
      .then((res) => res.json())
      .then((data) => setComingSoonAnim(data))
      .catch((err) =>
        console.error("Failed to load Lottie JSON", err)
      );
  }, []);

  // Load my uid from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem("myProfile");
      if (p) {
        const obj = JSON.parse(p);
        myUidRef.current = obj?.uid ?? null;
      }
    } catch {}
  }, []);

  // SEARCH HANDLER
  const runSearch = useCallback(
    debounce(async (text: string) => {
      if (!text.trim()) {
        setResults([]);
        setShowDropdown(false);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await discoverSearch({
          search_parameter: text.trim(),
        });
        setResults(Array.isArray(res) ? res : []);
        setShowDropdown(true);
      } catch (err) {
        console.error("discoverSearch error", err);
      } finally {
        setSearchLoading(false);
      }
    }, 250),
    []
  );

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  // OPEN PROFILE
  const openProfileByUid = async (uid: string) => {
    try {
      setOpeningProfile(true); // show loader
  
      const raw = await discoverGetUserByUid({ user_uid: uid });
      const mapped = mapUserProfile(raw as UserProfileOnReceive);
  
      if (myUidRef.current && myUidRef.current === uid) {
        navigate("/profile");
      } else {
        navigate(`/discover/profile/${uid}`, {
          state: { profile: mapped },
        });
      }
    } catch (err) {
      console.error("Failed to open profile", err);
    } finally {
      setOpeningProfile(false); // hide loader
    }
  };
  

  // OPEN POST OWNER MENU
  const openPostOwnerMenu = async (poster_uid: string) => {
    try {
      setSheetOpen(true);
      const raw = await discoverGetUserByUid({ user_uid: poster_uid });
      const mapped = mapUserProfile(raw as UserProfileOnReceive);
      setSelectedUser(mapped);
    } catch (err) {
      console.error("openPostOwnerMenu failed", err);
    }
  };

  // BLOCK / UNBLOCK handlers
  const handleBlockSelected = async (uid?: string) => {
    if (!uid) return;
    setRelationBusy(true);
    try {
      await setBlock({ blocks: [uid] });
      setSelectedUser((s) => (s ? { ...s, has_blocked: true } : s));
      setSheetOpen(false);
    } catch (err) {
      console.error("Error blocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };

  const handleUnblockSelected = async (uid?: string) => {
    if (!uid) return;
    setRelationBusy(true);
    try {
      await setUnblock({ unblocks: [uid] });
      setSelectedUser((s) => (s ? { ...s, has_blocked: false } : s));
      setSheetOpen(false);
    } catch (err) {
      console.error("Error unblocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };

  // REPORT
  const submitReportForSelected = async () => {
    if (!selectedUser) return;
    setReportBusy(true);
    try {
      let emailToSend = selectedUser.email ?? null;

      if (!emailToSend) {
        try {
          const raw = await discoverGetUserByUid({
            user_uid: selectedUser.uid,
          });
          const mapped = mapUserProfile(raw as UserProfileOnReceive);
          emailToSend = mapped.email ?? null;
        } catch {}
      }

      await submitUserReport({
        reportedUid: selectedUser.uid,
        reportedName: selectedUser.name,
        reportedEmail: emailToSend,
        reason: reportReason ?? "Other",
        details: reportDetails,
      });

      resetReportState();
      setModal(null);
      setSheetOpen(false);
    } catch (err) {
      console.error("report submit failed", err);
      setReportBusy(false);
    }
  };

  // POSTS (Infinite scroll)
  // POSTS (Infinite scroll)
  const loadPosts = useCallback(
    async (pg: number) => {
      if (loadingPosts || !hasMorePosts) return;

      setLoadingPosts(true);
      try {
        const data: any = await discoverGetFeedPosts(pg);
        const arr = Array.isArray(data) ? data : [];

        // ⬅️ ADD THIS
        if (pg === 1) setInitialLoadingPosts(false);

        if (arr.length === 0) {
          setHasMorePosts(false);
        } else {
          const cleaned: DiscoverPost[] = arr.map((p: any) => ({
            post_id: p.post_id,
            picture: p.picture,
            caption: p.caption,
            posted_on: p.posted_on,

            poster_uid: p.poster_uid,
            poster_name: p.poster_name,
            poster_avatar: p.poster_avatar ?? null,
            poster_department: p.poster_department ?? null,

            workerUrl: toWorkerPostUrlClean(p.picture),
          }));

          setPosts((prev) => {
            const map = new Map(prev.map((p) => [p.post_id, p]));
            cleaned.forEach((p) => map.set(p.post_id, p));
            return Array.from(map.values());
          });

          if (arr.length < 10) setHasMorePosts(false);
        }
      } catch (err) {
        console.error("post load error", err);
      } finally {
        setLoadingPosts(false);
      }
    },
    [loadingPosts, hasMorePosts]
  );


  useEffect(() => {
    loadPosts(page);
  }, [page]);

  // Infinite scroll
  const scrollLockRef = useRef(false);

  useEffect(() => {
    const fn = () => {
      if (scrollLockRef.current) return;

      const scrollPos = window.innerHeight + window.scrollY;
      const threshold = document.body.offsetHeight - 300;

      if (scrollPos >= threshold && !loadingPosts && hasMorePosts) {
        scrollLockRef.current = true;
        setPage((p) => p + 1);

        setTimeout(() => {
          scrollLockRef.current = false;
        }, 600);
      }
    };

    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [loadingPosts, hasMorePosts]);

  return (
    <div className="min-h-screen pb-[2rem] bg-[#1F0004] text-white px-[0.3rem]">
      {/* Header */}
      <div className="pt-[1rem] ml-[0.5rem]">
        <h1 className="text-4xl my-[0rem] pt-[1rem] font-extrabold">
          Discover
        </h1>
        <p className="text-lg text-gray-300 mt-[0.3rem]">
          Find your perfect match with our smart algorithms
        </p>
      </div>

      {/* Search Bar */}
      <div className="mt-6 relative">
        <div className="flex items-center gap-[1rem] bg-[#0D0002] rounded-lg px-[1rem] py-[0.3rem] mx-[0.4rem] max-w-screen rounded-[2rem]">
          <Search size={23} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search someone special..."
            className="bg-transparent h-[2.5rem] outline-none placeholder:text-gray-400  text-[1.2rem] border-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setShowDropdown(false);
              }}
              className="text-gray-400 bg-transparent"
            >
              <Trash size={23} className="opacity-70" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown &&
          (searchLoading ? (
            <div className="fixed inset-[0rem] z-50 flex items-center justify-center bg-black/70">
              <div className="bg-[#240909] p-6 rounded-lg">
                <div className="animate-pulse text-white text-lg">
                  Loading profiles…
                </div>
              </div>
            </div>
          ) : (
            results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-[0rem] right-[0rem]  rounded-lg mt-2 z-50 shadow-lg"
              >
                {results.map((r) => (
                  <button
                    key={r.uid}
                    onClick={() => {
                      setShowDropdown(false);
                      openProfileByUid(r.uid);
                    }}
                    className="w-full bg-[#0D0002] my-[0.5rem] py-[0.8rem] flex items-center gap-4 px-[0.8rem] rounded-[2rem] hover:bg-[#241111]"
                  >
                    <img
                      src={
                        r.avataar
                          ? `${WORKER_BASE}${r.avataar}`
                          : "/profile_placeholder.jpg"
                      }
                      className="w-[2.5rem] h-[2.5rem] rounded-full object-cover"
                      alt={r.name}
                    />
                    <div className="text-left ml-[0.5rem]">
                      <div className="font-semibold text-[0.9rem]">
                        {r.name}
                      </div>
                      <div className="text-[0.7rem] mt-[0.1rem] text-gray-400">
                        {r.department_name ?? ""}{" "}
                        {r.programme_code ? `, ${r.programme_code}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )
          ))}
      </div>

      {/* ----------- Feed ----------- */}
      {!query && (
        <div>
          {/* Algorithms Banner */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold ml-[0.5rem] mb-4">Matching algorithms</h2>

            <div className="rounded-lg overflow-hidden bg-[#0D0002] px-[0.2rem] m-[0.7rem] flex items-center justify-center">
              {comingSoonAnim ? (
                <div className="flex px-[0.5rem]">
                  <Lottie
                  animationData={comingSoonAnim}
                  loop
                  autoplay
                  className="rounded-md"
                  />
                  <div className="text-[#FF5069]  text-semibold text-[2rem]">
                    <div>COMING</div>
                    <div>SOON!</div>
                  </div>
                </div>
                
              ) : (
                <div className="text-white/50 text-sm italic">Loading animation…</div>
              )}
            </div>
          </div>

      

          {/* Posts */}
          <div className="mt-10">
            <h2 className="text-2xl ml-[0.5rem] font-bold mb-4">Latest Posts around you</h2>

            {!initialLoadingPosts && (
              <div className="space-y-6 bg-[#0D0002] my-[0.5rem] py-[0.9rem] pr-[0.5rem]">
              {posts.map((p) => (
                <div key={p.post_id} className="bg- rounded-lg overflow-hidden">
                  <div className="flex items-center px-4 py-3">
                    <img
                      src={
                        p.poster_avatar
                          ? `${WORKER_BASE}${p.poster_avatar}`
                          : "/profile_placeholder.jpg"
                      }
                      alt={p.poster_name}
                      className="w-[2.5rem] h-[2.5rem] rounded-full object-cover"
                    />

                    <div className="ml-3 flex-1">
                      <button
                        onClick={() => openProfileByUid(p.poster_uid)}
                        className="text-left bg-transparent"
                      >
                        <div className="font-semibold text-[1rem]">
                          {p.poster_name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {p.poster_department}
                        </div>
                      </button>
                    </div>

                    <button
                      className="w-[2.5rem] h-[2.5rem] rounded-full bg-[#2b1a1a] flex items-center justify-center"
                      onClick={() => openPostOwnerMenu(p.poster_uid)}
                      aria-label="Open post menu"
                    >
                      <MoreVertical />
                    </button>
                  </div>

                  {p.workerUrl && (
                    <img
                      src={p.workerUrl}
                      className="w-full aspect-[4/5] py-[0.5rem] object-cover"
                      alt="post"
                    />
                  )}

                  <div className="px-4 pb-[0.7rem] flex text-sm">
                    <button
                      className="bg-transparent"
                      onClick={() => {
                        // console.log("TODO: Post liking is under development");
                      }}
                    >
                      <PostLikeButton />
                    </button>
                    <div className="">
                      <p className="my-[0rem] text-[1.1rem]">{p.caption}</p>
                      <p className="my-[0rem] text-[0.8rem] text-[#D1D5DB]">
                        {formatDate(p.posted_on)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {loadingPosts && (
                <div className="flex gap-[0.5rem] items-center justify-center bg-black text-white">
                  <div className="animate-pulse text-[1rem] italic">
                    Loading posts
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
            )}

            {!hasMorePosts && posts.length > 0 && (
              <div className="text-center text-[1rem] italic">No more posts</div>
            )}
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <AnimatePresence>
        {sheetOpen && selectedUser && (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => setSheetOpen(false)}
              className="fixed inset-[0rem] z-[60] bg-[transparent] border-none "
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
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
                <div className="w-full flex justify-center">
                  <DashWide
                    style={{
                      width: "10rem",
                      height: "3rem",
                      color: "white",
                      padding: "0rem",
                    }}
                    strokeWidth={2.5}
                  />
                </div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />
                <button
                  className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white"
                  onClick={() => {
                    setSheetOpen(false);
                    setModal(
                      selectedUser.has_blocked ? "unblock" : "block"
                    );
                  }}
                >
                  {selectedUser.has_blocked
                    ? "Unblock user"
                    : "Block user"}
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
                <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center modal */}
      <AnimatePresence>
        {modal && selectedUser && (
          <>
            <motion.button
              type="button"
              aria-label="Close modal"
              onClick={() =>
                relationBusy || reportBusy
                  ? null
                  : (resetReportState(), setModal(null))
              }
              className="fixed inset-0 z-[70] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[22rem] rounded-[1rem] bg-[#1a1a1a] p-[1rem] text-white"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 320, damping: 26 },
              }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {modal === "report" ? (
                <>
                  <h3 className="text-[1.25rem] font-semibold mb-[0.4rem]">
                    Report {selectedUser.name}
                  </h3>
                  <p className="text-white/80 text-[1rem] mb-[0.9rem]">
                    Choose a reason and (optionally) add details for our
                    review team.
                  </p>

                  <div className="space-y-[0.6rem] mb-[0.8rem]">
                    {(
                      ["Cyberbullying or abuse", "Spam or misleading content", "Other"] as ReportReason[]
                    ).map((label) => (
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
                        onClick={submitReportForSelected}
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
                    {modal === "block"
                      ? `Block ${selectedUser.name}?`
                      : `Unblock ${selectedUser.name}?`}
                  </h3>

                  {modal === "block" ? (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
                      Blocked users will not appear in your algorithms and
                      they cannot see your account details. Chatting will be
                      disabled until you manually unblock.
                    </p>
                  ) : (
                    <p className="text-white/80 text-[0.95rem] mb-[0.9rem]">
                      They will start appearing again in algorithms and can
                      see your public details. Chatting will be enabled.
                    </p>
                  )}

                  <div className="flex flex-col justify-center items-center gap-[0.6rem]">
                    {modal === "block" ? (
                      <button
                        className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
                        onClick={() => handleBlockSelected(selectedUser.uid)}
                        disabled={relationBusy}
                      >
                        {relationBusy ? "Blocking..." : "Block"}
                      </button>
                    ) : (
                      <button
                        className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
                        onClick={() =>
                          handleUnblockSelected(selectedUser.uid)
                        }
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
    
    {/* Fullscreen overlay while opening profile */}
    {openingProfile && (
      <div className="fixed inset-[0rem] z-[100] backdrop-blur-[0.5rem] flex items-center justify-center">
        <div className="bg-[#0D0002] px-[2rem] pb-[1.2rem] rounded-[0.8rem] shadow-lg flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mt-[2rem]">
              <img
                src="/search_undraw.png"
                alt=""
                className="w-[12rem] h-[11rem] opacity-80"
              />
            </div>         
            <div className="animate-pulse flex justify-center gap-[0.5rem] text-white text-[1rem] mt-[0.8rem]">
              Fetching Profile Data
              <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
            />
            </div>           
        </div>
      </div>
    )}

    </div>
  );
}
