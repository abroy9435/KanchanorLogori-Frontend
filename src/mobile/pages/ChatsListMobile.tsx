// src/mobile/pages/ChatsListMobile.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ref,
  onValue,
  off,
  get,
  query,
  orderByKey,
  limitToLast,
  update,
  serverTimestamp,
} from "firebase/database";
import { database } from "../../shared/utils/firebase";
import { useAuth } from "../../shared/context/AuthContext";
import api from "../../shared/api";
import { decrypt } from "../../shared/utils/crypto";
import { motion } from "framer-motion";

// WORKER BASE for avatar
const WORKER_BASE =
  "https://r2-image-proxy.files-tu-dating-app.workers.dev/";

type ConvPreview = {
  convId: string;
  partnerUid: string;
  partnerName?: string;
  partnerAvatar?: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unread?: boolean;
};

const normalizeTs = (v: any): number => {
  let n = Number(v ?? 0) || 0;
  if (n > 1e9 && n < 1e12) n *= 1000; // sec → ms
  return n;
};

const safeDecrypt = (raw: any): string => {
  try {
    return typeof raw === "string" ? decrypt(raw) : String(raw ?? "");
  } catch {
    return String(raw ?? "");
  }
};

export default function ChatsListMobile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [previews, setPreviews] = useState<ConvPreview[]>([]);

  // NEW — loading state for loader box
  const [loadingChats, setLoadingChats] = useState(true);

  const listenersRef = useRef<{ [k: string]: () => void }>({});

  useEffect(() => {
    if (!user) return;

    const userMatchesRef = ref(database, "usermatches");

    const handleMatches = (snap: any) => {
      const val = snap.val() || {};
      const convIds: string[] = [];

      Object.keys(val).forEach((matchId) => {
        const match = val[matchId];
        if (!match) return;
        if (match.user1 === user.uid || match.user2 === user.uid) {
          convIds.push(matchId);
        }
      });

      // If no chats at all → stop loading
      if (convIds.length === 0) {
        setLoadingChats(false);
      }

      // cleanup removed listeners
      Object.keys(listenersRef.current).forEach((convId) => {
        if (!convIds.includes(convId)) {
          try {
            listenersRef.current[convId]!();
          } catch {}
          delete listenersRef.current[convId];
          setPreviews((prev) => prev.filter((p) => p.convId !== convId));
        }
      });

      // attach listeners
      convIds.forEach((convId) => {
        if (listenersRef.current[convId]) return;

        const convRef = ref(database, `conversations/${convId}`);

        const convCallback = async (convSnap: any) => {
          const conv = convSnap.val();
          if (!conv) return;

          const partnerUid =
            conv.user1 === user.uid ? conv.user2 : conv.user1;

          // ---- read meta ----
          let lastMessage = "";
          let lastTimestamp = normalizeTs(
            conv.lastTimestamp ?? conv.lastTime
          );
          let lastSender: string | undefined = conv.lastSender;

          if (conv.lastMessage)
            lastMessage = safeDecrypt(conv.lastMessage);

          // ---- fallback messages ----
          let convMsg = null;
          try {
            const snap = await get(
              query(
                ref(database, `conversations/${convId}/messages`),
                orderByKey(),
                limitToLast(1)
              )
            );
            const node = snap.val();
            if (node && typeof node === "object") {
              convMsg = node[Object.keys(node)[0]];
            }
          } catch {}

          let legacyMsg = null;
          try {
            const snap = await get(
              query(
                ref(database, `messages/${convId}`),
                orderByKey(),
                limitToLast(1)
              )
            );
            const node = snap.val();
            if (node && typeof node === "object") {
              legacyMsg = node[Object.keys(node)[0]];
            }
          } catch {}

          const pick = (msg: any) => {
            if (!msg)
              return { text: "", ts: 0, sender: undefined as string | undefined };
            const text = safeDecrypt(msg.text ?? msg.message ?? "");
            const ts = normalizeTs(msg.timestamp ?? msg.time);
            const sender = msg.sender as string | undefined;
            return { text, ts, sender };
          };

          const a = pick(convMsg);
          const b = pick(legacyMsg);
          let fallback = a;
          if (b.ts > a.ts) fallback = b;

          if (
            !lastMessage ||
            !lastTimestamp ||
            (fallback.ts && fallback.ts > lastTimestamp)
          ) {
            if (fallback.text) lastMessage = fallback.text;
            if (fallback.ts) lastTimestamp = fallback.ts;
            if (fallback.sender) lastSender = fallback.sender;
          }

          if (!lastMessage) lastMessage = "New Match!";

          // unread logic
          const seen = normalizeTs(conv[`lastseen_${user.uid}`]);
          const unread =
            !!lastTimestamp &&
            !!lastSender &&
            lastSender !== user.uid &&
            (seen === 0 || seen < lastTimestamp);

          // ---- fetch partner profile ----
          try {
            const { data } = await api.post(
              "/discover/byUid",
              { user_uid: partnerUid },
              { headers: { "Content-Type": "application/json" } }
            );

            // FIXED: avatar must use WORKER BASE
            const resolvedAvatar = data?.avataar
              ? `${WORKER_BASE}${data.avataar}`
              : "/profile_placeholder.jpg";

            updatePreview(
              convId,
              partnerUid,
              data?.name || "User",
              resolvedAvatar,
              lastMessage,
              lastTimestamp,
              unread
            );
          } catch {
            updatePreview(
              convId,
              partnerUid,
              "Unknown User",
              "/profile_placeholder.jpg",
              lastMessage,
              lastTimestamp,
              unread
            );
          }

          // Remove loader once first conv loads
          setLoadingChats(false);
        };

        onValue(convRef, convCallback);
        listenersRef.current[convId] = () =>
          off(convRef, "value", convCallback);
      });
    };

    onValue(userMatchesRef, handleMatches);

    return () => {
      off(userMatchesRef, "value", handleMatches);

      Object.values(listenersRef.current).forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      listenersRef.current = {};
    };
  }, [user]);

  function updatePreview(
    convId: string,
    partnerUid: string,
    partnerName?: string,
    partnerAvatar?: string,
    lastMessage?: string,
    lastTimestamp?: number,
    unread?: boolean
  ) {
    setPreviews((prev) => {
      const newEntry: ConvPreview = {
        convId,
        partnerUid,
        partnerName,
        partnerAvatar,
        lastMessage,
        lastTimestamp,
        unread,
      };
      const exists = prev.some((p) => p.convId === convId);
      const list = exists
        ? prev.map((p) =>
            p.convId === convId ? { ...p, ...newEntry } : p
          )
        : [newEntry, ...prev];

      return list.sort(
        (a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)
      );
    });
  }

  const handleOpen = async (convId: string) => {
    if (!user) return;
    try {
      update(ref(database, `conversations/${convId}`), {
        [`lastseen_${user.uid}`]: serverTimestamp(),
      });
    } catch {}
    setPreviews((prev) =>
      prev.map((p) =>
        p.convId === convId ? { ...p, unread: false } : p
      )
    );
    navigate(`/chats/${convId}`);
  };

  return (
    <div className="min-h-[100vh] min-w-full w-full overflow-x-hidden bg-[linear-gradient(to_bottom,#000000_0%,#0D0002_0.5%,#1F0004_100%)] text-white">
      {/* Header */}
      <div className="px-[1rem] pt-[1.25rem] pb-[0.5rem]">
        <h1 className="text-[2.4rem] font-semibold leading-tight">Inbox</h1>
        <p className="text-[1rem] text-white/80 mt-[0.2rem]">
          A place for your new matches and conversations.
        </p>
      </div>

      {/* Content */}
      <div className="px-[0.75rem] pb-[1rem]">

        {/* NEW — loader box added here */}
        {loadingChats && (
          <div className="w-full flex items-center justify-center py-[2rem]">
            <div className="animate-pulse flex justify-center italic gap-[0.5rem] text-white text-[1rem] mt-[0.8rem]">
              Loading chats
              <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
            />
            </div> 
          </div>
        )}

        {!loadingChats && previews.length === 0 ? (
          <div className="flex flex-col items-center justify-start mt-[2rem]">
            <img
              src="/networkerror_undraw.png"
              alt="No conversations"
              className="w-[14rem] h-auto opacity-80"
            />
            <p className="mt-[0.75rem] text-white/70">No conversations yet</p>
          </div>
        ) : (
          previews.map((p) => (
            <button
              key={p.convId}
              onClick={() => handleOpen(p.convId)}
              className="w-full text-left bg-[#000000] border-transparent rounded-[1rem] hover:bg-black/40 transition px-[0.9rem] py-[0.8rem] mb-[0.3rem] shadow-[0_0.1rem_0.4rem_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center gap-[0.9rem]">
                <img
                  src={
                    p.partnerAvatar
                      ? p.partnerAvatar
                      : "/profile_placeholder.jpg"
                  }
                  alt={p.partnerName || "User"}
                  className="w-[3rem] h-[3rem] rounded-full object-cover flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <div className="text-[1.1rem] font-semibold truncate">
                        {p.partnerName || "User"}
                      </div>
                      <div className="text-[0.95rem] text-white/70 truncate">
                        {p.lastMessage || ""}
                      </div>
                    </div>

                    <div className="ml-[0.6rem] flex items-center gap-[0.5rem] flex-shrink-0">
                      {p.unread ? (
                        <span
                          className="inline-block w-[0.7rem] h-[0.7rem] rounded-full"
                          style={{ backgroundColor: "#FF5069" }}
                        />
                      ) : (
                        <span className="inline-block w-[0.7rem] h-[0.7rem] rounded-full bg-transparent" />
                      )}
                      <div className="text-[0.9rem] text-white/70">
                        {p.lastTimestamp ? formatClock(p.lastTimestamp) : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// 4:12 pm format
function formatClock(ts: number) {
  const d = new Date(Number(ts));
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
