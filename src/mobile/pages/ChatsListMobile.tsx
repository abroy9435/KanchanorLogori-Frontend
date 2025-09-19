// // src/mobile/pages/ChatsListMobile.tsx
// "use client";
// import React, { useEffect, useState, useRef } from "react";
// import { Link } from "react-router-dom";
// import { ref, onValue, off } from "firebase/database";
// import { database } from "../../shared/utils/firebase";
// import { useAuth } from "../../shared/context/AuthContext";
// import api from "../../shared/api"; // axios wrapper
// import { decrypt } from "../../shared/utils/crypto";

// type ConvPreview = {
//   convId: string;
//   partnerUid: string;
//   partnerName?: string;
//   partnerAvatar?: string;
//   lastMessage?: string;
//   lastTimestamp?: number;
//   unread?: boolean;
// };

// export default function ChatsListMobile() {
//   const { user } = useAuth();
//   const [previews, setPreviews] = useState<ConvPreview[]>([]);
//   const listenersRef = useRef<{ [k: string]: Function }>({});

//   useEffect(() => {
//     if (!user) return;

//     const userMatchesRef = ref(database, "usermatches");

//     const handleMatches = (snap: any) => {
//       const val = snap.val() || {};
//       const convIds: string[] = [];

//       Object.keys(val).forEach((matchId) => {
//         const match = val[matchId];
//         if (!match) return;
//         if (match.user1 === user.uid || match.user2 === user.uid) {
//           convIds.push(matchId);
//         }
//       });

//       // Cleanup old listeners
//       Object.keys(listenersRef.current).forEach((convId) => {
//         if (!convIds.includes(convId)) {
//           const unlisten = listenersRef.current[convId];
//           if (unlisten) unlisten();
//           delete listenersRef.current[convId];
//           setPreviews((prev) => prev.filter((p) => p.convId !== convId));
//         }
//       });

//       // Attach listener for each conversation root
//       convIds.forEach((convId) => {
//         if (listenersRef.current[convId]) return;

//         const convRef = ref(database, `conversations/${convId}`);

//         const convCallback = async (convSnap: any) => {
//           const conv = convSnap.val();
//           if (!conv) return;

//           let lastMessage = "";
//           let lastTimestamp = 0;

//           // if lastMessage exists
//           if (conv.lastMessage) {
//             try {
//               lastMessage = decrypt(conv.lastMessage);
//             } catch {
//               lastMessage = conv.lastMessage;
//             }
//           }

//           // timestamp fallback
//           if (conv.lastTimestamp) {
//             lastTimestamp = conv.lastTimestamp;
//           }

//           // If no lastMessage → New Match!
//           if (!lastMessage) {
//             lastMessage = "New Match!";
//           }

//           const partnerUid =
//             conv.user1 === user.uid ? conv.user2 : conv.user1;

//           // unread detection
//           const unread =
//             conv.lastMessage &&
//             conv.lastSender &&
//             conv.lastSender !== user.uid &&
//             (!conv[`lastseen_${user.uid}`] ||
//               conv[`lastseen_${user.uid}`] < conv.lastTimestamp);

//           try {
//             const { data } = await api.post(
//               "/discover/byUid",
//               { user_uid: partnerUid },
//               { headers: { "Content-Type": "application/json" } }
//             );
//             updatePreview(
//               convId,
//               partnerUid,
//               data?.name,
//               data?.avataar,
//               lastMessage,
//               lastTimestamp,
//               unread
//             );
//           } catch (err) {
//             console.error("❌ Error fetching partner profile", err);
//             updatePreview(
//               convId,
//               partnerUid,
//               "Unknown User",
//               undefined,
//               lastMessage,
//               lastTimestamp,
//               unread
//             );
//           }
//         };

//         onValue(convRef, convCallback);

//         listenersRef.current[convId] = () => {
//           off(convRef, "value", convCallback);
//         };
//       });
//     };

//     onValue(userMatchesRef, handleMatches);

//     return () => {
//       off(userMatchesRef, "value", handleMatches);
//       Object.keys(listenersRef.current).forEach((convId) => {
//         try {
//           listenersRef.current[convId]();
//         } catch {}
//       });
//       listenersRef.current = {};
//     };
//   }, [user]);

//   function updatePreview(
//     convId: string,
//     partnerUid: string,
//     partnerName?: string,
//     partnerAvatar?: string,
//     lastMessage?: string,
//     lastTimestamp?: number,
//     unread?: boolean
//   ) {
//     setPreviews((prev) => {
//       const exists = prev.some((p) => p.convId === convId);
//       const newEntry: ConvPreview = {
//         convId,
//         partnerUid,
//         partnerName,
//         partnerAvatar,
//         lastMessage,
//         lastTimestamp,
//         unread,
//       };
//       if (exists) {
//         return prev
//           .map((p) => (p.convId === convId ? { ...p, ...newEntry } : p))
//           .sort(sortByTimestamp);
//       } else {
//         return [newEntry, ...prev].sort(sortByTimestamp);
//       }
//     });
//   }

//   function sortByTimestamp(a: ConvPreview, b: ConvPreview) {
//     return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
//   }

//   if (!user) {
//     return <div className="p-4 text-white">Please login</div>;
//   }

//   return (
//     <div className="p-4">
//       <h2 className="text-xl text-white mb-3">Messages</h2>
//       {previews.length === 0 ? (
//         <div className="text-gray-400">No matches yet</div>
//       ) : (
//         previews.map((p) => (
//           <Link
//             to={`/chats/${p.convId}`}
//             key={p.convId}
//             className="flex items-center gap-3 py-3 border-b border-gray-800"
//           >
//             <img
//               src={p.partnerAvatar || "/profile_placeholder.jpg"}
//               alt="loading..."
//               className="w-[2.5rem] h-[2.5rem] rounded-full object-cover"
//             />
//             <div className="flex-1">
//               <div className="flex justify-between items-center mx-[1rem]">
//                 <div className="font-bold text-white ">
//                   {p.partnerName || "User"}
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="text-xs text-gray-400">
//                     {p.lastTimestamp ? formatTimeAgo(p.lastTimestamp) : ""}
//                   </div>
//                   {p.unread && (
//                     <span
//                       className="inline-block w-2 h-2 rounded-full"
//                       style={{ backgroundColor: "#FF5069" }}
//                     ></span>
//                   )}
//                 </div>
//               </div>
//               <div className="text-sm text-gray-400 truncate">
//                 {p.lastMessage}
//               </div>
//             </div>
//           </Link>
//         ))
//       )}
//     </div>
//   );
// }

// // helper: time-ago formatter
// function formatTimeAgo(ts: number) {
//   const diff = Date.now() - ts;
//   const sec = Math.floor(diff / 1000);
//   if (sec < 60) return `${sec}s`;
//   const min = Math.floor(sec / 60);
//   if (min < 60) return `${min}m`;
//   const hr = Math.floor(min / 60);
//   if (hr < 24) return `${hr}h`;
//   const day = Math.floor(hr / 24);
//   return `${day}d`;
// }

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
  }catch{ return String(raw ?? ""); }
};

export default function ChatsListMobile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [previews, setPreviews] = useState<ConvPreview[]>([]);
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

      // cleanup removed
      Object.keys(listenersRef.current).forEach((convId) => {
        if (!convIds.includes(convId)) {
          try { listenersRef.current[convId]!(); } catch {}
          delete listenersRef.current[convId];
          setPreviews((prev) => prev.filter((p) => p.convId !== convId));
        }
      });

      // attach per-conversation listener
      convIds.forEach((convId) => {
        if (listenersRef.current[convId]) return;

        const convRef = ref(database, `conversations/${convId}`);

        const convCallback = async (convSnap: any) => {
          const conv = convSnap.val();
          if (!conv) return;

          const partnerUid = conv.user1 === user.uid ? conv.user2 : conv.user1;

          // 1) Try metadata
          let lastMessage = "";
          let lastTimestamp = normalizeTs(conv.lastTimestamp ?? conv.lastTime);
          let lastSender: string | undefined = conv.lastSender;

          if (conv.lastMessage) lastMessage = safeDecrypt(conv.lastMessage);

          // 2) Fallback to messages under conversations/...
          let convMsg: { text?: any; message?: any; timestamp?: any; time?: any; sender?: any } | null = null;
          try {
            const snap = await get(query(ref(database, `conversations/${convId}/messages`), orderByKey(), limitToLast(1)));
            const node = snap.val();
            if (node && typeof node === "object") {
              convMsg = node[Object.keys(node)[0]];
            }
          } catch {/* ignore */}

          // 3) Fallback to legacy path /messages/<convId> (Android most likely writes here)
          let legacyMsg: { text?: any; message?: any; timestamp?: any; time?: any; sender?: any } | null = null;
          try {
            const snap = await get(query(ref(database, `messages/${convId}`), orderByKey(), limitToLast(1)));
            const node = snap.val();
            if (node && typeof node === "object") {
              legacyMsg = node[Object.keys(node)[0]];
            }
          } catch {/* ignore */}

          // Choose the freshest between convMsg and legacyMsg
          const pick = (msg: any) => {
            if (!msg) return { text: "", ts: 0, sender: undefined as string | undefined };
            const text = safeDecrypt(msg.text ?? msg.message ?? "");
            const ts = normalizeTs(msg.timestamp ?? msg.time);
            const sender = msg.sender as string | undefined;
            return { text, ts, sender };
          };
          const a = pick(convMsg);
          const b = pick(legacyMsg);

          let fallback = a;
          // if timestamps are equal or missing, prefer whichever exists; else prefer newer
          if (b.ts > a.ts) fallback = b;

          // Use fallback only if meta is missing or older
          if (!lastMessage || !lastTimestamp || (fallback.ts && fallback.ts > lastTimestamp)) {
            if (fallback.text) lastMessage = fallback.text;
            if (fallback.ts)   lastTimestamp = fallback.ts;
            if (fallback.sender) lastSender = fallback.sender;
          }

          if (!lastMessage) lastMessage = "New Match!";

          // Unread: partner sent the last message and your lastseen is older
          const seen = normalizeTs(conv[`lastseen_${user.uid}`]);
          const unread =
            !!lastTimestamp &&
            !!lastSender &&
            lastSender !== user.uid &&
            (seen === 0 || seen < lastTimestamp);

          // partner profile
          try {
            const { data } = await api.post(
              "/discover/byUid",
              { user_uid: partnerUid },
              { headers: { "Content-Type": "application/json" } }
            );

            const resolvedAvatar =
              (typeof data?.avataar === "string" && data.avataar.trim().length > 0)
                ? data.avataar
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
        };

        onValue(convRef, convCallback);
        listenersRef.current[convId] = () => off(convRef, "value", convCallback);
      });
    };

    onValue(userMatchesRef, handleMatches);

    return () => {
      off(userMatchesRef, "value", handleMatches);
      Object.values(listenersRef.current).forEach((unsub) => {
        try { unsub(); } catch {}
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
        ? prev.map((p) => (p.convId === convId ? { ...p, ...newEntry } : p))
        : [newEntry, ...prev];
      return list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    });
  }

  const handleOpen = async (convId: string) => {
    if (!user) return;
    try {
      update(ref(database, `conversations/${convId}`), {
        [`lastseen_${user.uid}`]: serverTimestamp(),
      });
    } catch {}
    setPreviews((prev) => prev.map((p) => (p.convId === convId ? { ...p, unread: false } : p)));
    navigate(`/chats/${convId}`);
  };

  return (
    <div className="min-h-[100vh] min-w-full w-full overflow-x-hidden bg-[linear-gradient(to_bottom,#000000_0%,#000000_0.5%,#1F0004_100%)] text-white">
      {/* Header */}
      <div className="px-[1rem] pt-[1.25rem] pb-[0.5rem]">
        <h1 className="text-[2.4rem] font-semibold leading-tight">Inbox</h1>
        <p className="text-[1rem] text-white/80 mt-[0.2rem]">
          A place for your new matches and conversations.
        </p>
      </div>

      {/* Content */}
      <div className="px-[0.75rem] pb-[1rem]">
        {previews.length === 0 ? (
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
              className="w-full text-left bg-[#000000] border-none hover:bg-black/40 transition px-[0.9rem] py-[0.8rem] shadow-[0_0.1rem_0.4rem_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center gap-[0.9rem]">
                <img
                  src={
                    (typeof p.partnerAvatar === "string" && p.partnerAvatar.trim().length > 0)
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
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
