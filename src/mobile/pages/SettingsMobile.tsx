// src/mobile/pages/SettingsMobile.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { auth, app } from "../../shared/utils/firebase";
import Dropdown from "../../shared/components/DropDownicon";
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  LockIcon,
  LogOut,
  Heart,
  Star,
} from "lucide-react";

import { clearApiCaches } from '../../shared/api';


//--------------------------------------------------
// Add Notification enable/disable button using this
//--------------------------------------------------
import { requestPermissionAndInit } from "../../shared/utils/push";
import { useToast } from "../../shared/components/Toast";

function EnablePushButton() {
  const { push } = useToast();
  return (
    <button
      className="px-4 py-2 rounded-xl bg-[#FF5069] text-white"
      onClick={async () => {
        const token = await requestPermissionAndInit();
        if (token) {
          push({ message: "Notifications enabled!", variant: "success" });
          // optionally POST the token to your backend
        } else {
          push({
            message:
              "Notifications are blocked or not granted. If blocked, allow them in site settings and try again.",
            variant: "error",
          });
        }
      }}
    >
      Enable notifications
    </button>
  );
}


export default function SettingsMobile() {
  const navigate = useNavigate();
  const db = getFirestore(app); // use your initialized app

  // Report a problem
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Delete account
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // paste your privacy URL later
  const PRIVACY_URL1 = "http://kanchanar-logori-landing.vercel.app/privacy.html"; // e.g. "https://yourdomain.com/privacy"
  const PRIVACY_URL2 = "https://play.google.com/store/apps/details?id=com.psydrite.datingapp"; // e.g. "https://yourdomain.com/privacy"

  const canSubmitReport = useMemo(
    () => reportText.trim().length > 0 && !submittingReport,
    [reportText, submittingReport]
  );

  const handleSubmitReport = async () => {
    const text = reportText.trim();
    if (!text || submittingReport) return;
    try {
      setSubmittingReport(true);
      await addDoc(collection(db, "reports_problem"), {
        report: text,
        time: serverTimestamp(),
        uid: auth.currentUser ? auth.currentUser.uid : null,
        source: "pwa",
      });
      setReportText("");
      alert("Thanks! Your report has been sent.");
    } catch (err) {
      console.error("Failed to send report:", err);
      alert("Couldn't send your report. Please try again.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate || deactivating) return;
    try {
      setDeactivating(true);
      await addDoc(collection(db, "reports_user"), {
        report: "account deletion request",
        time: serverTimestamp(),
        uid: auth.currentUser ? auth.currentUser.uid : null,
        source: "pwa",
      });
      await signOut(auth);
      await clearApiCaches();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Deactivate failed:", err);
      alert("Something went wrong. Please try again.");
      setDeactivating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearApiCaches();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Couldn't log out. Try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full pb-[96px] bg-[#0D0002] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0D0002] backdrop-blur px-4 py-3 flex items-center gap-3">
        <button
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full bg-transparent border-none active:scale-[0.98]"
        >
          <ArrowLeft size={30} />
        </button>
        <h2 className="text-[2.3rem]">Settings</h2>
      </div>

      <div className="px-[0.4rem] text-[1.2rem]">
        {/* Report a problem */}
        <Dropdown
          label={
            <div className="flex items-center h-[3.5rem] gap-[0.5rem]">
              <AlertTriangle size={22} className="opacity-70" />
              <span className="text-[1.2rem] text-[]">Report a problem</span>
            </div>
          }
        >
          <div className="mt-[0.5rem] !border-none flex flex-col items-center">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe..."
              rows={4}
              className="w-[20rem] flex items-center bg-transparent h-[1rem] placeholder-white/40 rounded-[0.5rem] p-[1rem] text-sm outline-none border border-[#564d4e] focus:border-white/20"
            />
            <button
              onClick={handleSubmitReport}
              disabled={!canSubmitReport}
              className={`my-[0.5rem] bg-[#564d4e] text-[0.9rem] rounded-full py-[0.9rem] px-[4rem] text-sm font-medium transition 
                ${
                  canSubmitReport
                    ? "bg-[#FF5069] active:scale-[0.99]"
                    : "bg-[#3A2E30] text-[#9A9A9A] cursor-not-allowed"
                }`}
            >
              {submittingReport ? "Sending..." : "Submit"}
            </button>

          </div>
        </Dropdown>

        {/* Manage notifications (placeholder) */}
        {/* <div className="py-4 border-t border-white/5 text-base opacity-90">
          Manage notifications
        </div> */}

        {/* Delete account */}
        <Dropdown
          label={
            <div className="flex items-center h-[3.5rem] gap-[0.5rem]">
              <Trash2 size={22} className="opacity-70" />
              <span className="text-base text-[1.2rem]">Delete your account</span>
            </div>
          }
        >
          <div className="mt-[0.3rem] flex flex-col items-center">
            <p className="text-[1rem] text-[#564d4e] leading-relaxed bg-transparent border border-[#564d4e] p-[0.4rem] rounded-lg">
              Your account will be deactivated and you will be logged out. If
              you do not login again for 30 days, your data will be permanently
              deleted.
            </p>

            <label className="mt-3 flex items-center gap-2 text-[1rem]">
              I understand
              <input
                type="checkbox"
                checked={confirmDeactivate}
                onChange={(e) => setConfirmDeactivate(e.target.checked)}
                className="h-[0.9rem] w-[0.9rem] rounded-full accent-[#1F0004]"
              />
            </label>

            <button
              onClick={handleDeactivate}
              disabled={!confirmDeactivate || deactivating}
              className={`my-[0.5rem] bg-[#564d4e] text-[0.9rem] rounded-full py-[0.9rem] px-[4rem] text-sm font-medium transition 
                ${
                  confirmDeactivate && !deactivating
                    ? "bg-[#FF5069] text-white active:scale-[0.99]"
                    : "bg-[#241A1C] text-[#8C8C8C] cursor-not-allowed"
                }`}
            >
              {deactivating ? "Processing..." : "Deactivate my account"}
            </button>

          </div>
        </Dropdown>

        {/* About us */}
        <Dropdown           
          label={
            <div className="flex items-center h-[3.5rem] gap-[0.5rem]">
              <Heart size={22} className="opacity-70" />
              <span className="text-base text-[1.2rem]">About us</span>
            </div>
          }>
          <div className="mt-2 text-[13px] h-full leading-6 ">
            <p className="text-[1rem]">
              2023–2027 batch, united by a shared vision: to build a platform
              where people can connect meaningfully and authentically. Our goal
              is to deliver a smooth, personalized experience that brings people
              together!
            </p>

            <div className="mt-3 text-[1rem] space-y-1 h-full text-white/70">
              <p >Our Team:</p>
              <p>
                Android Application: Prudam Priyosanga Dutta (Btech ECE
                2023–27 batch)
              </p>
              <p>
                Website: Dhritiman Saikia and Abhijit Roy (Btech CSE 2023–27
                batch)
              </p>
            </div>

            <div className="mb-[0.4rem]  text-[1rem]">
              <a
                href="mailto:psydriteofficial@gmail.com"
                className="text-white"
              >
                psydriteofficial@gmail.com
              </a>
            </div>
          </div>
        </Dropdown>

        {/* Privacy Policy (external link placeholder) */}
        <div className="border-b border-[#564d4e]">
          {/* <span className="text-base">Privacy policy</span> */}
          <button
            onClick={() => {
              if (PRIVACY_URL1) {
                window.open(PRIVACY_URL1, "_blank", "noopener,noreferrer");
              } else {
                alert("Privacy policy link coming soon.");
              }
            }}
            className="active:scale-[0.99] gap-[0.5rem] h-[3.5rem] w-full bg-[#0D0002] flex items-center text-[1.2rem]"
          >
          <LockIcon size={22} className="opacity-70" />
          Privacy policy
          </button>
        </div>

        {/* Rate us (placeholder) */}
        <div className="flex py-4 items-center h-[3.5rem] gap-[0.5rem] text-[1.2rem] border-b border-[#564d4e]">
          <button onClick={() => {
                if (PRIVACY_URL2) {
                  window.open(PRIVACY_URL2, "_blank", "noopener,noreferrer");
                } else {
                  alert("Privacy policy link coming soon.");
                }
              }}
              className="active:scale-[0.99] gap-[0.5rem] h-[3.5rem] w-full bg-[#0D0002] flex items-center text-[1.2rem]"><Star size={22} className="opacity-70" />
              Rate us
          </button>
        </div>

        {/* Logout */}
        <Dropdown
          className="border-none"
          label={
            <div className="flex items-center h-[3.5rem] gap-[0.5rem]">
              <LogOut size={22} className="opacity-70" />
              <span className="text-[1.2rem] text-[]">Logout</span>
            </div>
          }
        >
          <div className="pt-3 flex justify-center items-center">
            <button
              onClick={handleLogout}
              className="my-[0.5rem] bg-[#1F0004] text-[0.9rem] rounded-full py-[0.9rem] px-[4rem] text-[#FF5069] font-medium transition"
            >
              Logout
            </button>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}

