// src/mobile/pages/GateMobile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../shared/services/userService";
import { useAuth } from "../../shared/context/AuthContext";
import { auth } from "../../shared/utils/firebase";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
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

// --- Add Password Overlay ---
function AddPasswordOverlay({
  visible,
  onSubmit,
  onCancel,
  password,
  setPassword,
  submitting,
}: {
  visible: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  password: string;
  setPassword: (v: string) => void;
  submitting: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-[0rem] backdrop-blur-[0.5rem] flex items-center justify-center z-[9999]">
      <div className="bg-[#1F0004] rounded-[1rem] w-[85%] max-w-[22rem] p-[1rem] text-center shadow-xl animate-fadeIn">
        <div className="text-white text-[1.3rem] mb-[1rem]">
          Add a Password
        </div>

        <p className="text-gray-300 text-sm mb-3">
          You can add a password to your account for easy login via Email and Password (Recommended for IOS Users)
        </p>

        <input
          type="password"
          value={password}
          placeholder="Create new password"
          disabled={submitting}
          className="w-[17rem] px-[1.5rem] py-[1.3rem] text-[1rem] rounded-[2rem] bg-[#0D0002] border-transparent text-white mb-[0.8rem] focus:ring-0 focus:outline-none"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Save Password */}
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-[13rem] bg-[#FF5069] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          {submitting ? <Spinner /> : "Save Password"}
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-[13rem] bg-[#1A1A1A] text-white px-[1.5rem] py-[0.8rem] text-[1rem] rounded-full shadow-md my-[0.5rem]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export default function GateMobile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "feed" | "register" | "login" | "error"
  >("loading");

  // NEW: Add Password Modal State
  const [needsPassword, setNeedsPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // SP-A loader for attach-password
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // -------------------------
  // Detect if Google-only user → Show add-password modal
  // -------------------------
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const providers = user.providerData.map((p) => p.providerId);

    const hasGoogle = providers.includes("google.com");
    const hasPassword = providers.includes("password");

    if (hasGoogle && !hasPassword) {
      setNeedsPassword(true);
    }
  }, [user, loading]);

  // -------------------------
  // Handle attach password
  // -------------------------
  const handleAttachPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setSubmittingPassword(true);
    try {
      const cred = EmailAuthProvider.credential(user!.email!, newPassword);
      await linkWithCredential(auth.currentUser!, cred);

      alert("Password added successfully! You can now log in without Google.");
      setNeedsPassword(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to attach password: " + err.message);
    } finally {
      setSubmittingPassword(false);
    }
  };

  // -------------------------
  // Gate logic (unchanged)
  // -------------------------
  useEffect(() => {
    let alive = true;

    if (loading) return;
    if (!user) {
      setStatus("login");
      return;
    }

    (async () => {
      try {
        await getMyProfile();
        if (alive) setStatus("feed");
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 404) {
          if (alive) setStatus("register");
        } else if (code === 401) {
          if (alive) setStatus("login");
        } else {
          console.error(err);
          if (alive) setStatus("error");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, loading]);

  useEffect(() => {
    if (status === "feed" && !needsPassword) {
      navigate("/feed", { replace: true });
    }
    if (status === "register") navigate("/register", { replace: true });
    if (status === "login") navigate("/", { replace: true });
    if (status === "error") navigate("/error", { replace: true });
  }, [status, navigate, needsPassword]);

  if (status === "loading") {
    return (
      <div className="min-w-screen fixed inset-[0rem]">
        <div className="text-white p-8 flex gap-[0.7rem] justify-center items-center w-screen h-screen italic">
          Checking your profile
          <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-[0.7rem] h-[0.7rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
            />
        </div>
      </div>
    );
  }

  return (
    <>
      <AddPasswordOverlay
        visible={needsPassword}
        password={newPassword}
        setPassword={setNewPassword}
        onSubmit={handleAttachPassword}
        onCancel={() => setNeedsPassword(false)}
        submitting={submittingPassword}
      />
    </>
  );
}
