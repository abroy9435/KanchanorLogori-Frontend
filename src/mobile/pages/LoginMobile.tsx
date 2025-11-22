// src/mobile/pages/LoginMobile.tsx
"use client";
import React, { useState } from "react";
import { auth } from "../../shared/utils/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  isIOS,
  isInStandaloneMode,
  isWebView,
  isPrivateSafari
} from "../../shared/utils/deviceChecks";


// --- Error Overlay Component ---
function ErrorOverlay({
  message,
  onClose,
  wrongEmailUndraw
}: {
  message: string;
  onClose: () => void;
  wrongEmailUndraw: boolean;
}) {
  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1A1A1A] rounded-[1rem] w-[85%] max-w-[22rem] p-[0.5rem] shadow-2xl text-center animate-fadeIn">
      {wrongEmailUndraw && (
        <img
          src="/wrongemail_undraw.png"
          alt=""
          className="w-[14rem] h-[11rem] opacity-80"
        />
      )}

        <div className="text-white text-[1.2rem] mb-[0.9rem] leading-relaxed">{message}</div>
        <button
          onClick={onClose}
          className="mb-[0.6rem] text-[1rem] bg-[#FF5069] text-white px-[3rem] py-[0.3rem] border border-transparent rounded-[1.2rem] shadow-md"
        >
          OK
        </button>
      </div>
    </div>
  );
}

// popup fade animation (Tailwind-friendly)
const fadeInStyle = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.18s ease-out;
}
`;
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = fadeInStyle;
  document.head.appendChild(style);
}

// --- Helpers ---
function decodeJwtPayload(idToken: string): any {
  const [, payload] = idToken.split(".");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

const isTezuEmail = (email?: string | null) =>
  !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

export default function Login() {
  const [showOverlay, setShowOverlay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wrongEmailUndraw, setWrongEmail] = useState(false);

  const handleLogin = async () => {
    setShowOverlay(null);
    setLoading(true);

    // ❌ Block iOS modes where popup ALWAYS fails
    if (isIOS() && (isInStandaloneMode() || isWebView() || isPrivateSafari())) {
      setShowOverlay(
        "Google Login is blocked in this iOS mode. Please open in normal Safari (not Private Mode or PWA)."
      );
      setLoading(false);
      return;
    }

    try {
      // ensure a fresh picker
      try { await signOut(auth); } catch {}

      // 🔒 Force popup mode only (no redirect fallback)
      await setPersistence(auth, browserLocalPersistence);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        hd: "tezu.ac.in",
      });

      const result = await signInWithPopup(auth, provider);

      // --- DOMAIN VALIDATION ---
      const email = result.user.email ?? "";

      let hd: string | undefined;
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.idToken) {
        try {
          const payload = decodeJwtPayload(cred.idToken);
          hd = typeof payload?.hd === "string" ? payload.hd : undefined;
        } catch {}
      }

      const passes =
        isTezuEmail(email) &&
        (hd ? hd.toLowerCase() === "tezu.ac.in" : true);

      if (!passes) {
        await signOut(auth);
        throw new Error("WRONG_EMAIL");
      }

      // success
      window.location.href = "/gate";
    } catch (error: any) {
      const msg = error?.message || "";

      if (
        msg.includes("popup") ||
        msg.includes("cancelled") ||
        error?.code === "auth/popup-blocked"
      ) {
        setShowOverlay(
          "Popup was blocked. Please allow pop-ups for this site from your browser settings."
        );
      } else if (msg === "WRONG_EMAIL") {
        setWrongEmail(true);
        setShowOverlay(
          "Please sign in with your @tezu.ac.in Google account."
        );
      } else {
        setShowOverlay(msg || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
      
      {/* Top section */}
      <div className="flex flex-col items-center">
        <img
          src="/loginpage_art.png"
          alt="Login Illustration"
          className="w-40 mb-4"
        />
        <div className="text-center mb-[2rem]">
          <h1 className="text-[#FF5069] text-[1.8rem]">
            Ready to meet someone special?
          </h1>
          <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
            Continue with your University GSuite ID. Your partner is a few clicks away!
          </p>
        </div>
      </div>

      {/* Bottom login button */}
      <div className="w-[18rem] mx-auto">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
        >
          <img
            src="/google_icon.png"
            alt="Google logo"
            className="mr-[0.8rem] h-[2rem] object-contain"
          />
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>

      {/* Error Overlay */}
      {showOverlay && (
        <ErrorOverlay
          message={showOverlay}
          onClose={() => {
            setShowOverlay(null);
            setWrongEmail(false);   // <-- reset here
          }}
          wrongEmailUndraw={wrongEmailUndraw}
        />
      )}
    </div>
  );
}


// // src/mobile/pages/LoginMobile.tsx
// "use client";
// import React, { useState } from "react";
// import { auth } from "../../shared/utils/firebase";
// import {
//   GoogleAuthProvider,
//   signInWithPopup,
//   signOut,
// } from "firebase/auth";
// import {
//   isIOS,
//   isInStandaloneMode,
//   isWebView,
//   isPrivateSafari
// } from "../../shared/utils/deviceChecks";

// function decodeJwtPayload(idToken: string): any {
//   // decode base64url payload from a JWT
//   const [, payload] = idToken.split(".");
//   const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
//   return JSON.parse(json);
// }

// const isTezuEmail = (email?: string | null) =>
//   !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

// export default function Login() {
//   const [err, setErr] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     setErr(null);
//     setLoading(true);
//     try {
//       // ensure chooser even if we already have a Firebase session
//       try { await signOut(auth); } catch {}
  
//       const provider = new GoogleAuthProvider();
//       provider.setCustomParameters({
//         prompt: 'select_account',   // <-- force account picker
//         // prompt: 'consent select_account', // (optional) also show consent each time
//         hd: 'tezu.ac.in',           // hint the domain (not enforcement)
//       });
  
//       const result = await signInWithPopup(auth, provider);
  
//       // 1) Email domain check
//       const email = result.user.email ?? '';
  
//       // 2) Also check Google ID token's `hd` claim when present
//       let hd: string | undefined;
//       const cred = GoogleAuthProvider.credentialFromResult(result);
//       if (cred?.idToken) {
//         try {
//           const payload = decodeJwtPayload(cred.idToken);
//           hd = typeof payload?.hd === 'string' ? payload.hd : undefined;
//         } catch { /* ignore */ }
//       }
  
//       const passes = isTezuEmail(email) && (hd ? hd.toLowerCase() === 'tezu.ac.in' : true);
//       if (!passes) {
//         await signOut(auth);
//         throw new Error('Please sign in with your @tezu.ac.in Google account.');
//       }
  
//       window.location.href = '/gate';
//     } catch (error: any) {
//       setErr(error?.message || 'Login failed');
//     } finally {
//       setLoading(false);
//     }
//   };
  

//   return (
//     <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
//       {/* Top content */}
//       <div className="flex flex-col items-center">
//         <img src="/loginpage_art.png" alt="Login Illustration" className="w-40 mb-4" />
//         <div className="text-center mb-[2rem]">
//           <h1 className="text-[#FF5069] text-[1.8rem]">
//             Ready to meet someone special?
//           </h1>
//           <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
//             Continue with your University GSuite ID. Your partner is a few clicks away!
//           </p>
//         </div>
//       </div>

//       {/* Bottom button */}
//       <div className="w-[18rem] mx-auto">
//         <button
//           onClick={handleLogin}
//           disabled={loading}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img src="/google_icon.png" alt="Google logo" className="mr-[0.8rem] h-[2rem] object-contain" />
//           {loading ? "Signing in..." : "Sign in with Google"}
//         </button>
//         {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
//       </div>
//     </div>
//   );
// }
