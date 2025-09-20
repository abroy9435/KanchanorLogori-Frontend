
// // src/desktop/pages/Login.tsx
// import React, { useState } from 'react';
// // import Input from '../components/Input';
// // import Button from '../components/Button';
// // import { useAuth } from '../../shared/context/AuthContext';
// import { auth, provider } from "../../shared/utils/firebase"; 
// import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";

// export default function Login() {
//   const [err, setErr] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     setErr(null);
//     setLoading(true);
//     try {
//       const provider = new GoogleAuthProvider();
//       provider.setCustomParameters({
//         hd: "tezu.ac.in", // restrict to university GSuite domain
//       });

//       const result = await signInWithPopup(auth, provider);
//       console.log("User:", result.user);

//       // redirect after login
//       window.location.href = "/gate";
//     } catch (error: any) {
//       setErr(error?.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen flex flex-col justify-between px-6 py-8">
//       {/* Top content */}
//       <div className="flex flex-col items-center">
//         <img
//           src="/loginpage_art.png"
//           alt="Login Illustration"
//           className="w-40 mb-4"
//         />
  
//         <div className="text-center mb-6">
//           <h1 className="text-[#FF5069] font-semibold text-lg">
//             Ready to meet someone special?
//           </h1>
//           <p className="text-gray-300 text-sm mt-2">
//             Continue with your University GSuite ID. Your partner is a few clicks away!
//           </p>
//         </div>
//       </div>
  
//       {/* Bottom button */}
//       <div className="w-full max-w-sm mx-auto">
//         <button
//           onClick={handleLogin}
//           disabled={loading}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img
//             src="/google_icon.png"
//             alt="Google logo"
//             className="w-6 h-[40px] object-contain"
//           />
//           {loading ? "Signing in..." : "Sign in with Google"}
//         </button>
  
//         {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
//       </div>
//     </div>
//   );
  
// }

// src/mobile/pages/LoginMobile.tsx
"use client";
import React, { useState } from "react";
import { auth } from "../../shared/utils/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

function decodeJwtPayload(idToken: string): any {
  // decode base64url payload from a JWT
  const [, payload] = idToken.split(".");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

const isTezuEmail = (email?: string | null) =>
  !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

export default function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      // ensure chooser even if we already have a Firebase session
      try { await signOut(auth); } catch {}
  
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',   // <-- force account picker
        // prompt: 'consent select_account', // (optional) also show consent each time
        hd: 'tezu.ac.in',           // hint the domain (not enforcement)
      });
  
      const result = await signInWithPopup(auth, provider);
  
      // 1) Email domain check
      const email = result.user.email ?? '';
  
      // 2) Also check Google ID token's `hd` claim when present
      let hd: string | undefined;
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.idToken) {
        try {
          const payload = decodeJwtPayload(cred.idToken);
          hd = typeof payload?.hd === 'string' ? payload.hd : undefined;
        } catch { /* ignore */ }
      }
  
      const passes = isTezuEmail(email) && (hd ? hd.toLowerCase() === 'tezu.ac.in' : true);
      if (!passes) {
        await signOut(auth);
        throw new Error('Please sign in with your @tezu.ac.in Google account.');
      }
  
      window.location.href = '/gate';
    } catch (error: any) {
      setErr(error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
      {/* Top content */}
      <div className="flex flex-col items-center">
        <img src="/loginpage_art.png" alt="Login Illustration" className="w-40 mb-4" />
        <div className="text-center mb-[2rem]">
          <h1 className="text-[#FF5069] text-[1.8rem]">
            Ready to meet someone special?
          </h1>
          <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
            Continue with your University GSuite ID. Your partner is a few clicks away!
          </p>
        </div>
      </div>

      {/* Bottom button */}
      <div className="w-[18rem] mx-auto">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
        >
          <img src="/google_icon.png" alt="Google logo" className="mr-[0.8rem] h-[2rem] object-contain" />
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
      </div>
    </div>
  );
}
