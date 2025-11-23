// src/mobile/pages/LoginMobile.tsx
"use client";
import React, { useState, useEffect } from "react";
import { auth } from "../../shared/utils/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import type { UserCredential } from "firebase/auth";

import {
  isIOS,
  isInStandaloneMode,
  isWebView,
  isPrivateSafari,
} from "../../shared/utils/deviceChecks";
import {motion} from "framer-motion";

// SP-A Spinner (universal)
function Spinner() {
  return (
    <div className="flex justify-center">
      <motion.div 
    animate={{ rotate: 360 }}
      transition={{
      repeat: Infinity,
      duration: 1,
      ease: "linear",
    }}
    className="w-[1rem] h-[1rem] border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// --- Error Overlay Component (reused for wrong-email graphic) ---
function ErrorOverlay({
  message,
  onClose,
  wrongEmailUndraw,
}: {
  message: string;
  onClose: () => void;
  wrongEmailUndraw?: boolean;
}) {
  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[0.5rem] shadow-2xl text-center animate-fadeIn">
        {wrongEmailUndraw && (
          <img
            src="/wrongemail_undraw.png"
            alt=""
            className="w-[14rem] h-[11rem] opacity-80 mx-auto"
          />
        )}
        <div className="text-white text-[1.2rem] mb-[0.9rem] leading-relaxed">
          {message}
        </div>
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

// --- Email Login Overlay (same style) ---
function EmailLoginOverlay({
  email,
  setEmail,
  password,
  setPassword,
  onClose,
  onSubmit,
  onSwitchToSignup,
  onForgotPassword,
  submitting,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] shadow-2xl text-center animate-fadeIn">
        <div className="text-white text-[1.3rem] mb-[1rem]">Email Login</div>

        <input
          type="email"
          value={email}
          placeholder="University Email"
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <input
          type="password"
          value={password}
          placeholder="Password"
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem] "
        >
          {submitting ? <Spinner /> : "Login"  }
        </button>
        <button
          onClick={onClose}
          // Cancel remains clickable even while submitting (per C1)
          className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          Cancel
        </button>
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={onForgotPassword}
            className="text-[#FF5069] bg-transparent my-[0.3rem] text-sm underline"
          >
            Forgot password?
          </button>

          <button
            onClick={onSwitchToSignup}
            className="text-[#FF5069] bg-transparent my-[0.3rem] underline"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Signup Overlay (same style) ---
function SignupOverlay({
  email,
  setEmail,
  password,
  setPassword,
  onClose,
  onSubmit,
  sendResendVerification,
  submitting,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  sendResendVerification: (emailArg?: string) => Promise<void>;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[20rem] p-[1.2rem] shadow-2xl text-center animate-fadeIn">
        <div className="text-white text-[1.3rem] mb-[1rem]">Create Account</div>

        <input
          type="email"
          value={email}
          placeholder="University Email"
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <input
          type="password"
          value={password}
          placeholder="Password (min 6 chars)"
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          {submitting ? <Spinner /> : "Create account"}
        </button>
        <button
          onClick={onClose}
          className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          Cancel
        </button>
        <button
          onClick={() => sendResendVerification()}
          className="text-[#FF5069] bg-transparent my-[0.3rem] underline"
        >
          Resend verification email
        </button>
      </div>
    </div>
  );
}

// --- Forgot Password Overlay (same style) ---
function ForgotPasswordOverlay({
  email,
  setEmail,
  onClose,
  onSubmit,
  submitting,
}: {
  email: string;
  setEmail: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] shadow-2xl text-center animate-fadeIn">
        <div className="text-white text-[1.3rem] mb-[1rem]">Reset Password</div>

        <input
          type="email"
          value={email}
          placeholder="University Email"
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem] "
        >
          {submitting ? <Spinner /> : "Send reset link"}
        </button>

        <button
          onClick={onClose}
          className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          Cancel
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
  // global overlay + flags
  const [showOverlay, setShowOverlay] = useState<string | null>(null);
  const [wrongEmailUndraw, setWrongEmail] = useState(false);

  // separate loading states (A + C1)
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmailLogin, setLoadingEmailLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingForgot, setLoadingForgot] = useState(false);

  // Email auth states
  const [showEmailOverlay, setShowEmailOverlay] = useState(false);
  const [showSignupOverlay, setShowSignupOverlay] = useState(false);
  const [showForgotOverlay, setShowForgotOverlay] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // small helper to clear sensitive fields when closing overlays
  const clearEmailPassword = () => {
    setEmail("");
    setPassword("");
  };

  // -------------------
  // Google sign-in (existing)
  // -------------------
  const handleGoogleLogin = async () => {
    setShowOverlay(null);
    setLoadingGoogle(true);

    // ❌ Block iOS modes where popup ALWAYS fails
    if (isIOS() && (isInStandaloneMode() || isWebView() || isPrivateSafari())) {
      setShowOverlay(
        "Google Login is blocked in this iOS. Please use Email to login/signup"
      );
      setLoadingGoogle(false);
      return;
    }

    try {
      // ensure a fresh picker
      try {
        await signOut(auth);
      } catch {}

      // 🔒 Force popup mode only (no redirect fallback)
      await setPersistence(auth, browserLocalPersistence);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
        hd: "tezu.ac.in",
      });

      const result = await signInWithPopup(auth, provider);

      // --- DOMAIN VALIDATION ---
      const userEmail = result.user.email ?? "";

      let hd: string | undefined;
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.idToken) {
        try {
          const payload = decodeJwtPayload(cred.idToken);
          hd = typeof payload?.hd === "string" ? payload.hd : undefined;
        } catch {}
      }

      const passes =
        isTezuEmail(userEmail) &&
        (hd ? hd.toLowerCase() === "tezu.ac.in" : true);

      if (!passes) {
        await signOut(auth);
        throw new Error("WRONG_EMAIL_GOOGLE");
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
          "Popup was blocked. Please allow pop-ups for this site or try login/signup with Email"
        );
      } else if (msg === "WRONG_EMAIL_GOOGLE") {
        setWrongEmail(true);
        setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
      } else {
        setShowOverlay(msg || "Login failed. Please try again.");
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  // -------------------
  // Email/password login handler
  // -------------------
  const handleEmailLogin = async () => {
    // basic validation
    if (!email || !password) {
      setShowEmailOverlay(false);
      setShowOverlay("Please enter both email and password.");
      return;
    }
    if (!isTezuEmail(email)) {
      setShowEmailOverlay(false);
      setWrongEmail(true);
      setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
      return;
    }

    setLoadingEmailLogin(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // require email verification
      if (!cred.user.emailVerified) {
        setShowOverlay("Please verify your email before logging in.");
        setLoadingEmailLogin(false);
        return;
      }

      // success
      clearEmailPassword();
      setShowEmailOverlay(false);
      window.location.href = "/gate";
    } catch (err: any) {
      // firebase error codes
      if (err?.code === "auth/user-not-found") {
        setShowEmailOverlay(false);
        setShowOverlay("Account doesn't exist. Please create one.");
      } else if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        setShowEmailOverlay(false);
        setShowOverlay("Incorrect Email/password");
      } else {
        setShowEmailOverlay(false);
        setShowOverlay(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoadingEmailLogin(false);
    }
  };

  // -------------------
  // Signup (create account) handler
  // -------------------
  const handleSignup = async () => {
    if (!email || !password) {
      setShowSignupOverlay(false);
      setShowOverlay("Please enter both email and password.");
      return;
    }
    if (!isTezuEmail(email)) {
      setShowSignupOverlay(false);
      setWrongEmail(true);
      setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
      return;
    }
    if (password.length < 6) {
      setShowSignupOverlay(false);
      setShowOverlay("Password must be at least 6 characters!");
      return;
    }

    setLoadingSignup(true);
    try {
      const userCred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

      // send verification email
      try {
        await sendEmailVerification(userCred.user);
        setShowSignupOverlay(false);
        setShowOverlay("Verification email sent. Please check your inbox or spam folder.");
      } catch (sendErr: any) {
        setShowSignupOverlay(false);
        setShowOverlay(
          "Account created, but failed to send verification email. Try resend from Create Account overlay."
        );
      }

      // close signup and clear fields (user must verify before login)
      clearEmailPassword();
      setShowSignupOverlay(false);
    } catch (err: any) {
      // handle case where email already exists (likely Google account)
      if (err?.code === "auth/email-already-in-use") {
        setShowSignupOverlay(false);

        // If user is currently signed in (e.g., via Google) and it's the same email,
        // we can immediately link the new password credential to the existing account.
        const current = auth.currentUser;
        if (current && current.email && current.email.toLowerCase() === email.toLowerCase()) {
          try {
            const credential = EmailAuthProvider.credential(email, password);
            await linkWithCredential(current, credential);
            setShowOverlay("Password added to your existing account. You can now sign in with Email or Google.");
            clearEmailPassword();
            return;
          } catch (linkErr: any) {
            // linking failed — fall back to instruction
            setShowOverlay(
              "Could not link password automatically. Please sign in with Google, then try Create Account again."
            );
            clearEmailPassword();
            return;
          }
        }

        // Not signed in — instruct user to sign in with Google first
        setShowOverlay(
          "An account with this email already exists (likely Google). Please sign in with Google on this device, then open Create Account and re-enter the password to attach it to your account."
        );
      } else {
        setShowSignupOverlay(false);
        setShowOverlay(err?.message || "Sign up failed. Try again.");
      }
    } finally {
      setLoadingSignup(false);
    }
  };

  // -------------------
  // Resend verification email helper
  // -------------------
  const resendVerification = async (emailArg?: string) => {
    const targetEmail = emailArg ?? email;
    if (!targetEmail || !isTezuEmail(targetEmail)) {
      setShowSignupOverlay(false);
      setShowOverlay("Please provide a valid @tezu.ac.in email to resend verification.");
      return;
    }

    setLoadingSignup(true);
    try {
      // We don't have direct silent-send without a signed-in user. Guide user instead.
      setShowSignupOverlay(false);
      setShowOverlay("To resend verification, please login first or use the Create Account flow.");
    } finally {
      setLoadingSignup(false);
    }
  };

  // -------------------
  // Forgot password handler
  // -------------------
  const handleForgotPassword = async () => {
    if (!email) {
      setShowEmailOverlay(false);
      setShowOverlay("Please enter your university email to reset password.");
      return;
    }
    if (!isTezuEmail(email)) {
      setShowEmailOverlay(false);
      setShowOverlay("Please use your @tezu.ac.in email.");
      return;
    }

    setLoadingForgot(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setShowOverlay("Password reset link sent — check your email or spam folder");
      setShowForgotOverlay(false);
      clearEmailPassword();
    } catch (err: any) {
      setShowOverlay(err?.message || "Failed to send reset email. Try again.");
    } finally {
      setLoadingForgot(false);
    }
  };

  // Close overlay handler which also resets wrongEmail flag in right place
  const handleCloseOverlay = () => {
    setShowOverlay(null);
    setWrongEmail(false);
  };

  // clear illustration flag when overlay hides automatically
  useEffect(() => {
    if (!showOverlay) {
      setWrongEmail(false);
    }
  }, [showOverlay]);

  return (
    <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
      {/* Top section */}
      <div className="flex flex-col items-center">
        <img src="/loginpage_art.png" alt="Login Illustration" className="w-40 mb-4" />
        <div className="text-center mb-[2rem]">
          <h1 className="text-[#FF5069] text-[1.8rem]">Ready to meet someone special?</h1>
          <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
            Continue with your University GSuite ID. Your partner is a few clicks away!
          </p>
        </div>
      </div>

      {/* Bottom login buttons */}
      <div className="w-[18rem] mx-auto">
        {/* Google button (existing) */}
        <button
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
          className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[1.5rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
        >
          <img src="/google_icon.png" alt="Google logo" className="mr-[0.8rem] h-[2rem] object-contain" />
          {loadingGoogle ? <Spinner /> : "Sign in with Google"}
        </button>

        {/* Email login button - identical UI */}
        <button
          onClick={() => setShowEmailOverlay(true)}
          className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[1.5rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
        >
          <img src="/email_icon.png" alt="" className="mr-[0.8rem] h-[2rem] object-contain" />
          Login with Email
        </button>

        {/* Create account quick button (optional duplicate) */}
        <button
          onClick={() => setShowSignupOverlay(true)}
          className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
        >
          <img src="/signup_icon.png" alt="" className="mr-[0.8rem] h-[2rem] object-contain" />
          Create account
        </button>
      </div>

      {/* Error Overlay */}
      {showOverlay && (
        <ErrorOverlay message={showOverlay} onClose={handleCloseOverlay} wrongEmailUndraw={wrongEmailUndraw} />
      )}

      {/* Email Login Overlay */}
      {showEmailOverlay && (
        <EmailLoginOverlay
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onClose={() => {
            setShowEmailOverlay(false);
            clearEmailPassword();
            setWrongEmail(false);
          }}
          onSubmit={async () => {
            await handleEmailLogin();
          }}
          onSwitchToSignup={() => {
            setShowEmailOverlay(false);
            setShowSignupOverlay(true);
          }}
          onForgotPassword={() => {
            setShowEmailOverlay(false);
            setShowForgotOverlay(true);
          }}
          submitting={loadingEmailLogin}
        />
      )}

      {/* Signup Overlay */}
      {showSignupOverlay && (
        <SignupOverlay
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onClose={() => {
            setShowSignupOverlay(false);
            clearEmailPassword();
          }}
          onSubmit={async () => {
            await handleSignup();
          }}
          sendResendVerification={resendVerification}
          submitting={loadingSignup}
        />
      )}

      {/* Forgot Password Overlay */}
      {showForgotOverlay && (
        <ForgotPasswordOverlay
          email={email}
          setEmail={setEmail}
          onClose={() => {
            setShowForgotOverlay(false);
            clearEmailPassword();
          }}
          onSubmit={async () => {
            await handleForgotPassword();
          }}
          submitting={loadingForgot}
        />
      )}
    </div>
  );
}


// // src/mobile/pages/LoginMobile.tsx
// "use client";
// import React, { useState, useEffect } from "react";
// import { auth } from "../../shared/utils/firebase";
// import {
//   GoogleAuthProvider,
//   signInWithPopup,
//   signOut,
//   setPersistence,
//   browserLocalPersistence,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   sendEmailVerification,
//   sendPasswordResetEmail,
// } from "firebase/auth";
// import type  {UserCredential} from "firebase/auth";

// import {
//   isIOS,
//   isInStandaloneMode,
//   isWebView,
//   isPrivateSafari,
// } from "../../shared/utils/deviceChecks";

// // --- Error Overlay Component (reused for wrong-email graphic) ---
// function ErrorOverlay({
//   message,
//   onClose,
//   wrongEmailUndraw,
// }: {
//   message: string;
//   onClose: () => void;
//   wrongEmailUndraw?: boolean;
// }) {
//   return (
//     <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
//       <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[0.5rem] shadow-2xl text-center animate-fadeIn">
//         {wrongEmailUndraw && (
//           <img
//             src="/wrongemail_undraw.png"
//             alt=""
//             className="w-[14rem] h-[11rem] opacity-80 mx-auto"
//           />
//         )}
//         <div className="text-white text-[1.2rem] mb-[0.9rem] leading-relaxed">
//           {message}
//         </div>
//         <button
//           onClick={onClose}
//           className="mb-[0.6rem] text-[1rem] bg-[#FF5069] text-white px-[3rem] py-[0.3rem] border border-transparent rounded-[1.2rem] shadow-md"
//         >
//           OK
//         </button>
//       </div>
//     </div>
//   );
// }

// // --- Email Login Overlay (same style) ---
// function EmailLoginOverlay({
//   email,
//   setEmail,
//   password,
//   setPassword,
//   onClose,
//   onSubmit,
//   onSwitchToSignup,
//   onForgotPassword,
// }: {
//   email: string;
//   setEmail: (v: string) => void;
//   password: string;
//   setPassword: (v: string) => void;
//   onClose: () => void;
//   onSubmit: () => void;
//   onSwitchToSignup: () => void;
//   onForgotPassword: () => void;
// }) {
//   return (
//     <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
//       <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] shadow-2xl text-center animate-fadeIn">
//         <div className="text-white text-[1.3rem] mb-[1rem]">Email Login</div>

//         <input
//           type="email"
//           value={email}
//           placeholder="University Email"
//           className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <input
//           type="password"
//           value={password}
//           placeholder="Password"
//           className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <button
//           onClick={onSubmit}
//           className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Login
//         </button>
//         <button
//           onClick={onClose}
//           className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Cancel
//         </button>
//         <div className="flex justify-between items-center mt-2">
//           <button
//             onClick={onForgotPassword}
//             className="text-[#FF5069] bg-transparent my-[0.3rem] text-sm underline"
//           >
//             Forgot password?
//           </button>

//           <button
//             onClick={onSwitchToSignup}
//             className="text-[#FF5069] bg-transparent my-[0.3rem] underline"
//           >
//             Create account
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// }

// // --- Signup Overlay (same style) ---
// function SignupOverlay({
//   email,
//   setEmail,
//   password,
//   setPassword,
//   onClose,
//   onSubmit,
//   sendResendVerification,
// }: {
//   email: string;
//   setEmail: (v: string) => void;
//   password: string;
//   setPassword: (v: string) => void;
//   onClose: () => void;
//   onSubmit: () => void;
//   sendResendVerification: (emailArg?: string) => Promise<void>;
// }) {
//   return (
//     <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
//       <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] shadow-2xl text-center animate-fadeIn">
//         <div className="text-white text-[1.3rem] mb-[1rem]">Create Account</div>

//         <input
//           type="email"
//           value={email}
//           placeholder="University Email"
//           className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <input
//           type="password"
//           value={password}
//           placeholder="Password (min 6 chars)"
//           className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <button
//           onClick={onSubmit}
//           className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Create account
//         </button>
//         <button
//           onClick={onClose}
//           className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => sendResendVerification()}
//           className="text-[#FF5069] bg-transparent my-[0.3rem] underline"
//         >
//           Resend verification email
//         </button>

        
//       </div>
//     </div>
//   );
// }

// // --- Forgot Password Overlay (same style) ---
// function ForgotPasswordOverlay({
//   email,
//   setEmail,
//   onClose,
//   onSubmit,
// }: {
//   email: string;
//   setEmail: (v: string) => void;
//   onClose: () => void;
//   onSubmit: () => void;
// }) {
//   return (
//     <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
//       <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] shadow-2xl text-center animate-fadeIn">
//         <div className="text-white text-[1.3rem] mb-[1rem]">Reset Password</div>

//         <input
//           type="email"
//           value={email}
//           placeholder="University Email"
//           className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] text-white mb-[0.8rem] border border-transparent focus:border-[#0D0002] focus:ring-0 focus:outline-none"
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <button
//           onClick={onSubmit}
//           className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Send reset link
//         </button>

//         <button
//           onClick={onClose}
//           className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }

// // popup fade animation (Tailwind-friendly)
// const fadeInStyle = `
// @keyframes fadeIn {
//   from { opacity: 0; transform: scale(0.95); }
//   to { opacity: 1; transform: scale(1); }
// }
// .animate-fadeIn {
//   animation: fadeIn 0.18s ease-out;
// }
// `;
// if (typeof document !== "undefined") {
//   const style = document.createElement("style");
//   style.innerHTML = fadeInStyle;
//   document.head.appendChild(style);
// }

// // --- Helpers ---
// function decodeJwtPayload(idToken: string): any {
//   const [, payload] = idToken.split(".");
//   const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
//   return JSON.parse(json);
// }

// const isTezuEmail = (email?: string | null) =>
//   !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

// export default function Login() {
//   // global overlay + flags
//   const [showOverlay, setShowOverlay] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [wrongEmailUndraw, setWrongEmail] = useState(false);

//   // Email auth states
//   const [showEmailOverlay, setShowEmailOverlay] = useState(false);
//   const [showSignupOverlay, setShowSignupOverlay] = useState(false);
//   const [showForgotOverlay, setShowForgotOverlay] = useState(false);

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   // small helper to clear sensitive fields when closing overlays
//   const clearEmailPassword = () => {
//     setEmail("");
//     setPassword("");
//   };

//   // -------------------
//   // Google sign-in (existing)
//   // -------------------
//   const handleGoogleLogin = async () => {
//     setShowOverlay(null);
//     setLoading(true);

//     // ❌ Block iOS modes where popup ALWAYS fails
//     if (isIOS() && (isInStandaloneMode() || isWebView() || isPrivateSafari())) {
//       setShowOverlay(
//         "Google Login is blocked in this iOS. Please use Email to login/signup"
//       );
//       setLoading(false);
//       return;
//     }

//     try {
//       // ensure a fresh picker
//       try {
//         await signOut(auth);
//       } catch {}

//       // 🔒 Force popup mode only (no redirect fallback)
//       await setPersistence(auth, browserLocalPersistence);

//       const provider = new GoogleAuthProvider();
//       provider.setCustomParameters({
//         prompt: "select_account",
//         hd: "tezu.ac.in",
//       });

//       const result = await signInWithPopup(auth, provider);

//       // --- DOMAIN VALIDATION ---
//       const userEmail = result.user.email ?? "";

//       let hd: string | undefined;
//       const cred = GoogleAuthProvider.credentialFromResult(result);
//       if (cred?.idToken) {
//         try {
//           const payload = decodeJwtPayload(cred.idToken);
//           hd = typeof payload?.hd === "string" ? payload.hd : undefined;
//         } catch {}
//       }

//       const passes =
//         isTezuEmail(userEmail) &&
//         (hd ? hd.toLowerCase() === "tezu.ac.in" : true);

//       if (!passes) {
//         await signOut(auth);
//         throw new Error("WRONG_EMAIL_GOOGLE");
//       }

//       // success
//       window.location.href = "/gate";
//     } catch (error: any) {
//       const msg = error?.message || "";

//       if (
//         msg.includes("popup") ||
//         msg.includes("cancelled") ||
//         error?.code === "auth/popup-blocked"
//       ) {
//         setShowOverlay(
//           "Popup was blocked. Please allow pop-ups for this site or try login/signup with Email"
//         );
//       } else if (msg === "WRONG_EMAIL_GOOGLE") {
//         setWrongEmail(true);
//         setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
//       } else {
//         setShowOverlay(msg || "Login failed. Please try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // -------------------
//   // Email/password login handler
//   // -------------------
//   const handleEmailLogin = async () => {
//     // basic validation
//     if (!email || !password) {
//       setShowEmailOverlay(false);
//       setShowOverlay("Please enter both email and password.");
//       return;
//     }
//     if (!isTezuEmail(email)) {
//       setShowEmailOverlay(false);
//       setWrongEmail(true);
//       setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const cred = await signInWithEmailAndPassword(auth, email, password);

//       // require email verification
//       if (!cred.user.emailVerified) {
//         setShowOverlay("Please verify your email before logging in.");
//         setLoading(false);
//         return;
//       }

//       // success
//       clearEmailPassword();
//       setShowEmailOverlay(false);
//       window.location.href = "/gate";
//     } catch (err: any) {
//       // firebase error codes
//       if (err?.code === "auth/user-not-found") {
//         setShowEmailOverlay(false);
//         setShowOverlay("Account doesn't exist. Please create one.");
//       } else if (err?.code === "auth/wrong-password") {
//         setShowEmailOverlay(false);
//         setShowOverlay("Incorrect password.");
//       } else {
//         setShowEmailOverlay(false);
//         setShowOverlay(err?.message || "Login failed. Please try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // -------------------
//   // Signup (create account) handler
//   // -------------------
//   const handleSignup = async () => {
//     if (!email || !password) {
//       setShowSignupOverlay(false);
//       setShowOverlay("Please enter both email and password.");
//       return;
//     }
//     if (!isTezuEmail(email)) {
//       setShowSignupOverlay(false);
//       setWrongEmail(true);
//       setShowOverlay("Please sign in with your @tezu.ac.in GSUITE account.");
//       return;
//     }
//     if (password.length < 6) {
//       setShowSignupOverlay(false);
//       setShowOverlay("Password must be at least 6 characters!");
//       return;
//     }

//     setLoading(true);
//     try {
//       const userCred: UserCredential = await createUserWithEmailAndPassword(
//         auth,
//         email,
//         password
//       );

//       // send verification email
//       try {
//         await sendEmailVerification(userCred.user);
//         setShowSignupOverlay(false);
//         setShowOverlay("Verification email sent. Please check your inbox or spam folder.");
//       } catch (sendErr: any) {
//         setShowSignupOverlay(false);
//         setShowOverlay(
//           "Account created, but failed to send verification email. Try resend from Create Account overlay."
//         );
//       }

//       // close signup and clear fields (user must verify before login)
//       clearEmailPassword();
//       setShowSignupOverlay(false);
//     } catch (err: any) {
//       if (err?.code === "auth/email-already-in-use") {
//         setShowSignupOverlay(false);
//         setShowOverlay("An account with this email already exists. Try logging in.");
//       } else {
//         setShowSignupOverlay(false);
//         setShowOverlay(err?.message || "Sign up failed. Try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // -------------------
//   // Resend verification email helper
//   // -------------------
//   const resendVerification = async (emailArg?: string) => {
//     const targetEmail = emailArg ?? email;
//     if (!targetEmail || !isTezuEmail(targetEmail)) {
//       setShowSignupOverlay(false);
//       setShowOverlay("Please provide a valid @tezu.ac.in email to resend verification.");
//       return;
//     }

//     setLoading(true);
//     try {
//       // Try to sign in silently to get user object, if already registered
//       // But we don't want to sign in with wrong password—so we fetch user by trying signInWithEmailAndPassword would fail.
//       // Instead, Firebase requires an authenticated user to call sendEmailVerification.
//       // Workaround: Ask user to login first then click resend, or we attempt to signInWithEmailAndPassword if password provided.
//       // Here we'll attempt to sign in silently only if password present (common flow from signup overlay we keep email/password)
//       // If user is not signed in, inform them to login first or re-create account flow.
//       setShowSignupOverlay(false);
//       setShowOverlay("To resend verification, please login first or use the Create Account flow.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // -------------------
//   // Forgot password handler
//   // -------------------
//   const handleForgotPassword = async () => {
//     if (!email) {
//       setShowEmailOverlay(false);
//       setShowOverlay("Please enter your university email to reset password.");
//       return;
//     }
//     if (!isTezuEmail(email)) {
//       setShowEmailOverlay(false);
//       setShowOverlay("Please use your @tezu.ac.in email.");
//       return;
//     }

//     setLoading(true);
//     try {
//       await sendPasswordResetEmail(auth, email);
//       setShowOverlay("Password reset link sent — check your email or spam folder");
//       setShowForgotOverlay(false);
//       clearEmailPassword();
//     } catch (err: any) {
//       setShowOverlay(err?.message || "Failed to send reset email. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Close overlay handler which also resets wrongEmail flag in right place
//   const handleCloseOverlay = () => {
//     setShowOverlay(null);
//     setWrongEmail(false);
//   };

//   // clear illustration flag when overlay hides automatically
//   useEffect(() => {
//     if (!showOverlay) {
//       // After overlay closed, ensure wrong-email graphic removed
//       setWrongEmail(false);
//     }
//   }, [showOverlay]);

//   return (
//     <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
//       {/* Top section */}
//       <div className="flex flex-col items-center">
//         <img src="/loginpage_art.png" alt="Login Illustration" className="w-40 mb-4" />
//         <div className="text-center mb-[2rem]">
//           <h1 className="text-[#FF5069] text-[1.8rem]">Ready to meet someone special?</h1>
//           <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
//             Continue with your University GSuite ID. Your partner is a few clicks away!
//           </p>
//         </div>
//       </div>

//       {/* Bottom login buttons */}
//       <div className="w-[18rem] mx-auto">
//         {/* Google button (existing) */}
//         <button
//           onClick={handleGoogleLogin}
//           disabled={loading}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[1.5rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img src="/google_icon.png" alt="Google logo" className="mr-[0.8rem] h-[2rem] object-contain" />
//           {loading ? "Signing in..." : "Sign in with Google"}
//         </button>

//         {/* Email login button - identical UI */}
//         <button
//           onClick={() => setShowEmailOverlay(true)}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[1.5rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img src="/email_icon.png" alt="" className="mr-[0.8rem] h-[2rem] object-contain" />
//           Login with Email
//         </button>

//         {/* Create account quick button (optional duplicate) */}
//         <button
//           onClick={() => setShowSignupOverlay(true)}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img src="/signup_icon.png" alt="" className="mr-[0.8rem] h-[2rem] object-contain" />
//           Create account
//         </button>
//       </div>

//       {/* Error Overlay */}
//       {showOverlay && (
//         <ErrorOverlay message={showOverlay} onClose={handleCloseOverlay} wrongEmailUndraw={wrongEmailUndraw} />
//       )}

//       {/* Email Login Overlay */}
//       {showEmailOverlay && (
//         <EmailLoginOverlay
//           email={email}
//           setEmail={setEmail}
//           password={password}
//           setPassword={setPassword}
//           onClose={() => {
//             setShowEmailOverlay(false);
//             clearEmailPassword();
//             setWrongEmail(false);
//           }}
//           onSubmit={async () => {
//             await handleEmailLogin();
//           }}
//           onSwitchToSignup={() => {
//             setShowEmailOverlay(false);
//             setShowSignupOverlay(true);
//           }}
//           onForgotPassword={() => {
//             setShowEmailOverlay(false);
//             setShowForgotOverlay(true);
//           }}
//         />
//       )}

//       {/* Signup Overlay */}
//       {showSignupOverlay && (
//         <SignupOverlay
//           email={email}
//           setEmail={setEmail}
//           password={password}
//           setPassword={setPassword}
//           onClose={() => {
//             setShowSignupOverlay(false);
//             clearEmailPassword();
//           }}
//           onSubmit={async () => {
//             await handleSignup();
//           }}
//           sendResendVerification={resendVerification}
//         />
//       )}

//       {/* Forgot Password Overlay */}
//       {showForgotOverlay && (
//         <ForgotPasswordOverlay
//           email={email}
//           setEmail={setEmail}
//           onClose={() => {
//             setShowForgotOverlay(false);
//             clearEmailPassword();
//           }}
//           onSubmit={async () => {
//             await handleForgotPassword();
//           }}
//         />
//       )}
//     </div>
//   );
// }

// // src/mobile/pages/LoginMobile.tsx
// "use client";
// import React, { useState } from "react";
// import { auth } from "../../shared/utils/firebase";
// import {
//   GoogleAuthProvider,
//   signInWithPopup,
//   signOut,
//   setPersistence,
//   browserLocalPersistence,
// } from "firebase/auth";

// import {
//   isIOS,
//   isInStandaloneMode,
//   isWebView,
//   isPrivateSafari
// } from "../../shared/utils/deviceChecks";


// // --- Error Overlay Component ---
// function ErrorOverlay({
//   message,
//   onClose,
//   wrongEmailUndraw
// }: {
//   message: string;
//   onClose: () => void;
//   wrongEmailUndraw: boolean;
// }) {
//   return (
//     <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
//       <div className="bg-[#1A1A1A] rounded-[1rem] w-[85%] max-w-[22rem] p-[0.5rem] shadow-2xl text-center animate-fadeIn">
//       {wrongEmailUndraw && (
//         <img
//           src="/wrongemail_undraw.png"
//           alt=""
//           className="w-[14rem] h-[11rem] opacity-80"
//         />
//       )}

//         <div className="text-white text-[1.2rem] mb-[0.9rem] leading-relaxed">{message}</div>
//         <button
//           onClick={onClose}
//           className="mb-[0.6rem] text-[1rem] bg-[#FF5069] text-white px-[3rem] py-[0.3rem] border border-transparent rounded-[1.2rem] shadow-md"
//         >
//           OK
//         </button>
//       </div>
//     </div>
//   );
// }

// // popup fade animation (Tailwind-friendly)
// const fadeInStyle = `
// @keyframes fadeIn {
//   from { opacity: 0; transform: scale(0.95); }
//   to { opacity: 1; transform: scale(1); }
// }
// .animate-fadeIn {
//   animation: fadeIn 0.18s ease-out;
// }
// `;
// if (typeof document !== "undefined") {
//   const style = document.createElement("style");
//   style.innerHTML = fadeInStyle;
//   document.head.appendChild(style);
// }

// // --- Helpers ---
// function decodeJwtPayload(idToken: string): any {
//   const [, payload] = idToken.split(".");
//   const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
//   return JSON.parse(json);
// }

// const isTezuEmail = (email?: string | null) =>
//   !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

// export default function Login() {
//   const [showOverlay, setShowOverlay] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [wrongEmailUndraw, setWrongEmail] = useState(false);

//   const handleLogin = async () => {
//     setShowOverlay(null);
//     setLoading(true);

//     // ❌ Block iOS modes where popup ALWAYS fails
//     if (isIOS() && (isInStandaloneMode() || isWebView() || isPrivateSafari())) {
//       setShowOverlay(
//         "Google Login is blocked in this iOS mode. Please open in normal Safari (not Private Mode or PWA)."
//       );
//       setLoading(false);
//       return;
//     }

//     try {
//       // ensure a fresh picker
//       try { await signOut(auth); } catch {}

//       // 🔒 Force popup mode only (no redirect fallback)
//       await setPersistence(auth, browserLocalPersistence);

//       const provider = new GoogleAuthProvider();
//       provider.setCustomParameters({
//         prompt: "select_account",
//         hd: "tezu.ac.in",
//       });

//       const result = await signInWithPopup(auth, provider);

//       // --- DOMAIN VALIDATION ---
//       const email = result.user.email ?? "";

//       let hd: string | undefined;
//       const cred = GoogleAuthProvider.credentialFromResult(result);
//       if (cred?.idToken) {
//         try {
//           const payload = decodeJwtPayload(cred.idToken);
//           hd = typeof payload?.hd === "string" ? payload.hd : undefined;
//         } catch {}
//       }

//       const passes =
//         isTezuEmail(email) &&
//         (hd ? hd.toLowerCase() === "tezu.ac.in" : true);

//       if (!passes) {
//         await signOut(auth);
//         throw new Error("WRONG_EMAIL");
//       }

//       // success
//       window.location.href = "/gate";
//     } catch (error: any) {
//       const msg = error?.message || "";

//       if (
//         msg.includes("popup") ||
//         msg.includes("cancelled") ||
//         error?.code === "auth/popup-blocked"
//       ) {
//         setShowOverlay(
//           "Popup was blocked. Please allow pop-ups for this site from your browser settings."
//         );
//       } else if (msg === "WRONG_EMAIL") {
//         setWrongEmail(true);
//         setShowOverlay(
//           "Please sign in with your @tezu.ac.in Google account."
//         );
//       } else {
//         setShowOverlay(msg || "Login failed. Please try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-gradient-to-t from-[#1F0004] to-black min-h-screen max-w-screen flex flex-col justify-between px-[rem] py-8">
      
//       {/* Top section */}
//       <div className="flex flex-col items-center">
//         <img
//           src="/loginpage_art.png"
//           alt="Login Illustration"
//           className="w-40 mb-4"
//         />
//         <div className="text-center mb-[2rem]">
//           <h1 className="text-[#FF5069] text-[1.8rem]">
//             Ready to meet someone special?
//           </h1>
//           <p className="text-gray-300 text-sm mt-[3rem] mx-[1rem]">
//             Continue with your University GSuite ID. Your partner is a few clicks away!
//           </p>
//         </div>
//       </div>

//       {/* Bottom login button */}
//       <div className="w-[18rem] mx-auto">
//         <button
//           onClick={handleLogin}
//           disabled={loading}
//           className="flex items-center justify-center gap-3 text-[#FF5069] w-full py-[20px] rounded-full mb-[7rem] shadow-lg bg-[#000000] border-[#FF5069] transition"
//         >
//           <img
//             src="/google_icon.png"
//             alt="Google logo"
//             className="mr-[0.8rem] h-[2rem] object-contain"
//           />
//           {loading ? "Signing in..." : "Sign in with Google"}
//         </button>
//       </div>

//       {/* Error Overlay */}
//       {showOverlay && (
//         <ErrorOverlay
//           message={showOverlay}
//           onClose={() => {
//             setShowOverlay(null);
//             setWrongEmail(false);   // <-- reset here
//           }}
//           wrongEmailUndraw={wrongEmailUndraw}
//         />
//       )}
//     </div>
//   );
// }

