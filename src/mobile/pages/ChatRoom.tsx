// src/mobile/pages/Chatroom.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ref,
  onValue,
  off,
  push,
  set,
  update,
  serverTimestamp,
} from "firebase/database";
import { database } from "../../shared/utils/firebase";
import { useAuth } from "../../shared/context/AuthContext";
import api from "../../shared/api";
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { encrypt, decrypt } from "../../shared/utils/crypto";

/* ⬇️ NEW: imports for actions + UI */
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  submitUserReport,
  type ReportReason,
  setBlock,
  setUnblock,
} from "../../shared/api";
import { createLucideIcon } from "lucide-react";
import { discoverGetUserByUid } from "../../shared/api";
import { mapUserProfile } from "../../shared/utils/mapUserProfile";

export const DashWide = createLucideIcon("DashWide", [
  ["line", { x1: "2", y1: "12", x2: "22", y2: "12", key: "line" }],
]);
/* ⬆️ NEW */

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: number; // normalized to ms epoch on read
  status?: "sending" | "sent" | "failed";
};

type Partner = {
  uid?: string;
  name?: string;
  avataar?: string;
  department?: string; // <-- new
};

export default function Chatroom() {
  const { convId, conversationId } = useParams<{ convId?: string; conversationId?: string }>();
  const convKey = convId || conversationId;

  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [input, setInput] = useState("");

  // fixed header/footer heights (keep these in sync with classes below)
  const HEADER_H_REM = 3.75; // ~60px
  const INPUT_H_REM  = 4.25; // ~68px (button + padding)

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ⬇️ NEW: state for bottom sheet & modals (same as FeedMobile) */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modal, setModal] = useState<null | "block" | "unblock" | "report">(null);
  const [relationBusy, setRelationBusy] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false); // local toggle for label only
  // same loader UX as Discover
  const [openingProfile, setOpeningProfile] = useState(false);

  // report form state
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const resetReportState = () => {
    setReportReason(null);
    setReportDetails("");
    setReportBusy(false);
  };

  //Discover or open profile by Uid
  const openProfileFromChat = async () => {
    if (!partner?.uid) return;
    try {
      setOpeningProfile(true);
  
      const raw = await discoverGetUserByUid({ user_uid: partner.uid });
      const mapped = mapUserProfile(raw);
  
      // if user taps own name
      if (partner.uid === user?.uid) {
        navigate("/profile");
      } else {
        navigate(`/discover/profile/${partner.uid}`, {
          state: { profile: mapped },
        });
      }
    } catch (err) {
      console.error("openProfileFromChat failed", err);
    } finally {
      setOpeningProfile(false);
    }
  };
  
  // sheet animation
  const sheetVariants: Variants = {
    hidden: { y: "100%" },
    visible: { y: 0, transition: { type: "spring", stiffness: 380, damping: 40 } },
    exit: { y: "100%", transition: { type: "spring", stiffness: 380, damping: 40 } },
  };
  /* ⬆️ NEW */

  // --- Helpers ----------------------------------------------------------------

  const normalizeTs = (v: any): number => {
    let ts = Number(v ?? 0) || 0;
    if (ts > 1e9 && ts < 1e12) ts *= 1000; // seconds → ms
    return ts;
  };

  const parseMsg = (id: string, val: any): Message | null => {
    if (!val) return null;
    const sender = val.sender || val.user || val.from;
    if (!sender) return null;

    const rawText = val.text ?? val.message ?? val.msg ?? "";
    let text = rawText;
    try {
      text = typeof rawText === "string" ? decrypt(rawText) : rawText;
    } catch {
      text = rawText;
    }

    const ts = normalizeTs(val.timestamp ?? val.time ?? val.ts ?? val.createdAt ?? 0);
    return { id, sender, text, timestamp: ts, status: "sent" };
  };

  const e2s = (err: unknown) => {
    const anyErr = err as any;
    return anyErr?.message || anyErr?.code || (typeof anyErr === "string" ? anyErr : JSON.stringify(anyErr));
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    const d = new Date(Number(ts));
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // --- Data subscriptions ------------------------------------------------------

  // Load partner (also get department from API)
  useEffect(() => {
    if (!convKey || !user) return;

    const convRef = ref(database, `conversations/${convKey}`);
    const convCallback = async (snap: any) => {
      const conv = snap.val();
      if (!conv) return;

      const partnerUid = conv.user1 === user.uid ? conv.user2 : conv.user1;
      if (!partnerUid) return;

      // set UID immediately so UI can render avatar/name placeholder
      setPartner((p) => ({ ...(p || {}), uid: partnerUid }));

      try {
        const { data } = await api.post(
          "/discover/byUid",
          { user_uid: partnerUid },
          { headers: { "Content-Type": "application/json" } }
        );
        setPartner({
          uid: partnerUid,
          name: data?.name || "User",
          avataar: data.avataar?
          `https://r2-image-proxy.files-tu-dating-app.workers.dev/${data.avataar}`
          : "/profile_placeholder.jpg",
          department: data?.department_name || "", // <- show in banner
        });
      } catch {
        setPartner({
          uid: partnerUid,
          name: "Unknown User",
          avataar: "/profile_placeholder.jpg",
          department: "",
        });
      }
    };

    onValue(convRef, convCallback);
    return () => off(convRef, "value", convCallback);
  }, [convKey, user]);

  // Listen to conversations/<convId>/messages
  useEffect(() => {
    if (!convKey) return;

    const msgsRef = ref(database, `conversations/${convKey}/messages`);
    const cb = (snap: any) => {
      const val = snap.val() || {};
      const serverList: Message[] = Object.keys(val)
        .map((id) => parseMsg(id, val[id]))
        .filter(Boolean) as Message[];

      serverList.sort((a, b) => a.timestamp - b.timestamp);

      // merge with optimistic items still "sending"/"failed"
      setMessages((prev) => {
        const map = new Map<string, Message>();
        serverList.forEach((m) => map.set(m.id, m));
        prev.forEach((m) => {
          if ((m.status === "sending" || m.status === "failed") && !map.has(m.id)) {
            map.set(m.id, m);
          }
        });
        return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
      });
    };

    onValue(msgsRef, cb);
    return () => off(msgsRef, "value", cb);
  }, [convKey]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Sending -----------------------------------------------------------------

  const sendMessage = async () => {
    if (!convKey || !user) return;
    const raw = input.trim();
    if (!raw) return;

    setInput(""); // clear immediately

    const clientNow = Date.now(); // optimistic only
    const encrypted = (() => { try { return encrypt(raw); } catch { return raw; } })();

    const msgRef = push(ref(database, `conversations/${convKey}/messages`));
    const id = msgRef.key as string;

    // optimistic bubble (plaintext so user sees what they typed)
    setMessages((prev) => [
      ...prev,
      { id, sender: user.uid, text: raw, timestamp: clientNow, status: "sending" },
    ]);

    const payload = {
      sender: user.uid,
      receiver: partner?.uid || null,
      text: encrypted,
      timestamp: serverTimestamp(), // server time
      time: serverTimestamp(),      // android compat
      notiftitle: user.displayName || user.email || "Message",
    };

    try {
      await set(msgRef, payload);

      // convo summary (server time everywhere)
      try {
        await update(ref(database, `conversations/${convKey}`), {
          lastMessage: encrypted,
          lastTimestamp: serverTimestamp(),
          lastTime: serverTimestamp(),
          lastSender: user.uid,
          [`lastseen_${user.uid}`]: serverTimestamp(),
        });
      } catch (err) {
        console.warn("[send] update(conversations/convKey) failed (non-fatal):", e2s(err));
      }

      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)));
    } catch (err) {
      console.error("[send] set(conversations/.../messages/id) failed:", e2s(err), { convKey, id });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m)));
    }
  };

  /* ⬇️ NEW: menu actions (same behavior as FeedMobile) */
  const handleBlock = async () => {
    if (!partner?.uid) return;
    setRelationBusy(true);
    try {
      await setBlock({ blocks: [partner.uid] });
      setHasBlocked(true);
      setModal(null);
    } catch (err) {
      console.error("Error blocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };

  const handleUnblock = async () => {
    if (!partner?.uid) return;
    setRelationBusy(true);
    try {
      await setUnblock({ unblocks: [partner.uid] });
      setHasBlocked(false);
      setModal(null);
    } catch (err) {
      console.error("Error unblocking user", err);
    } finally {
      setRelationBusy(false);
    }
  };
  /* ⬆️ NEW */

  // --- UI ---------------------------------------------------------------------
  // layout: fixed header + fixed input bar; messages area fills the space between
  // explicit rem sizing to respect your Tailwind config

  return (
    <div className="relative w-screen  h-[100vh] text-white bg-[#0D0002]">
      {/* Top banner (fixed) */}
      <div
        className="fixed left-[0px] right-[0px] top-[0px] z-[20] bg-[#000000] backdrop-blur-[0.1rem]"
        style={{ height: `${HEADER_H_REM}rem` }}
      >
        <div className="flex items-center justify-between px-[1rem] h-full">
          <div className="flex items-center gap-[0.1rem] min-w-0">
            <button onClick={() => navigate(-1)} className="text-white/80 bg-[#000000] border-none hover:text-white">
              <ArrowLeft className="w-[1.5rem] h-[1.5rem]" />
            </button>
            <button
              onClick={openProfileFromChat}
              className="flex items-center gap-[0.75rem] bg-transparent border-none text-left p-0"
            >
              <img
                src={partner?.avataar || "/profile_placeholder.jpg"}
                alt={partner?.name || "User"}
                className="w-[2.75rem] h-[2.75rem] rounded-full object-cover flex-shrink-0"
              />
              <div className="flex flex-col mr-[0.1rem]">
                <span className="font-[semibold] truncate leading-[1.2]">
                  {partner?.name || "Loading..."}
                </span>

                {partner?.department ? (
                  <span className="text-[0.7rem] text-white/70 truncate">
                    {partner.department}
                  </span>
                ) : (
                  <span className="text-[0.8rem] text-white/40">Loading...</span>
                )}
              </div>
            </button>

          </div>

          {/* ⬇️ NEW: open bottom sheet on click (kept your styling) */}
          <button
            className="text-white/80 rounded-[2.5rem] py-[0.2rem] bg-[#82817c]/50 border-none hover:text-white"
            onClick={() => setSheetOpen(true)}
          >
            <MoreVertical className="w-[1.5rem] h-[1.5rem]" />
          </button>
          {/* ⬆️ NEW */}
        </div>
      </div>

      {/* Input bar (fixed bottom) */}
      <div
        className="fixed left-[0px] right-[0px] bottom-[0px] z-[20] bg-[#0D0002] backdrop-blur-[0.1rem]"
        style={{ height: `${INPUT_H_REM}rem` }}
      >
        <div className="flex items-center gap-[0.6rem] px-[1rem] h-full">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type something..."
            className="flex-1 h-[3rem] px-[1rem] border-none rounded-full bg-[#000000] text-white placeholder-white/50 outline-none"
          />
          <button
            onClick={sendMessage}
            className="w-[3rem] h-[3rem] rounded-[1rem] border-none bg-[#FF5069] hover:opacity-90 flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="w-[1.25rem] h-[1.25rem] text-[#000000]" />
          </button>
        </div>
      </div>

      {/* Messages area (scrolls behind header, above input) */}
      <div
        className="absolute left-[0.1rem] right-[0.1rem] overflow-y-auto px-[1rem] space-y-[0.6rem]"
        style={{
          top: `${HEADER_H_REM}rem`,
          bottom: `${INPUT_H_REM}rem`,
        }}
      >
        {messages.length === 0 ? (
          <div className="text-white/50 text-center mt-[1rem]">No messages yet</div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender === user?.uid;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-[1rem] py-[0.7rem] rounded-[1.25rem] max-w-[75%] text-white shadow-[0_0.1rem_0.4rem_rgba(0,0,0,0.25)] ${
                    isMe
                      ? "bg-[#FF5069] rounded-br-[0.4rem]"
                      : "bg-[#000000] rounded-bl-[0.4rem]" // same color as requested
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className="text-[0.68rem] text-white/80 mt-[0.35rem] flex items-center gap-[0.3rem] justify-end">
                    {m.status === "sending" && <Loader2 className="w-[0.9rem] h-[0.9rem] animate-spin" />}
                    {m.status === "failed" && <AlertCircle className="w-[0.9rem] h-[0.9rem] text-black/80" />}
                    {m.status === "sent" && <Check className="w-[0.9rem] h-[0.9rem] opacity-90" />}
                    <span>{formatTime(m.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ⬇️ NEW: Bottom Sheet + Modals (copied style from FeedMobile) */}
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
                <div className="w-full flex justify-center">
                  <DashWide style={{ width: "10rem", height: "3rem", color: "white", padding: "0rem" }} strokeWidth={2.5} />
                </div>
                <div className="mx-auto mb-[0.6rem] h-[0.3rem] w-[2.5rem] rounded-full bg-white/20" />

                {/* Block / Unblock */}
                <button
                  className="w-full text-left text-[1.05rem] bg-[transparent] border-none py-[0.9rem] text-white"
                  onClick={() => {
                    setSheetOpen(false);
                    setModal(hasBlocked ? "unblock" : "block");
                  }}
                >
                  {hasBlocked ? "Unblock user" : "Block user"}
                </button>

                <div className="h-[1px] bg-white/10" />

                {/* Report */}
                <button
                  className="w-full text-left bg-[transparent] border-none text-[1.05rem] py-[0.9rem] text-white"
                  onClick={() => {
                    setSheetOpen(false);
                    setModal("report");
                  }}
                >
                  Report account
                </button>

                {/* Hidden for now: Mute conversation (placeholder for future) */}
                <button
                  className="w-full text-left bg-[transparent] border-none text-[1.05rem] py-[0.9rem] text-white hidden"
                  onClick={() => {
                    /* intentionally hidden – to be implemented later */
                  }}
                >
                  Mute conversation
                </button>

                {/* Safe area padding */}
                <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center Modal: Block / Unblock + Report */}
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
                  <h3 className="text-[1.25rem] font-semibold mb-[0.4rem]">Report {partner?.name || "user"}</h3>
                  <p className="text-white/80 text-[1rem] mb-[0.9rem]">
                    Choose a reason and (optionally) add details for our review team.
                  </p>

                  {/* radio list — same labels */}
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

                  {/* additional info textbox */}
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Additional information"
                    rows={3}
                    className="w-[18.8rem] rounded-[0.7rem] bg-white/5 text-white p-[0.75rem] text-[0.95rem] placeholder-white/40 outline-none mb-[0.9rem]"
                  />

                  {/* actions */}
                  <div className="flex justify-center w-full gap-[0.6rem]">
                    <div className="w-[6rem]">
                      <button
                        className="px-[0.9rem] py-[0.5rem] mb-[0.8rem] rounded-[0.6rem] w-full border-none bg-[#FF5069] text-white disabled:opacity-60"
                        disabled={!reportReason || reportBusy}
                        onClick={async () => {
                          if (!reportReason || !partner?.uid) return;
                          try {
                            setReportBusy(true);
                            await submitUserReport({
                              reportedUid: partner.uid,
                              reportedName: partner.name || "Unknown",
                              reportedEmail: null, // we don't have email here
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
                    {modal === "block" ? `Block ${partner?.name || "user"}?` : `Unblock ${partner?.name || "user"}?`}
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
                        onClick={handleBlock}
                        disabled={relationBusy}
                      >
                        {relationBusy ? "Blocking..." : "Block"}
                      </button>
                    ) : (
                      <button
                        className="px-[0.9rem] py-[0.5rem] rounded-[0.6rem] w-[6.6rem] border-none bg-[#FF5069] text-black disabled:opacity-60"
                        onClick={handleUnblock}
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
      {/* ⬆️ NEW */}
      
      {/* Fullscreen overlay while opening profile */}
      {openingProfile && (
        <div className="fixed inset-[0rem] z-[100] flex items-center justify-center">
          <div className="bg-[#0D0002] px-[2rem] pb-[1.2rem] rounded-[0.8rem] shadow-lg flex flex-col items-center">
            <div className="flex flex-col items-center justify-center mt-[2rem]">
              <img
                src="/search_undraw.png"
                alt=""
                className="w-[11rem] h-[11rem] opacity-80"
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
