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
  ExternalLink,
  LogOut,
} from "lucide-react";


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
  const PRIVACY_URL = "http://kanchanar-logori-landing.vercel.app/privacy.html"; // e.g. "https://yourdomain.com/privacy"

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
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Couldn't log out. Try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full pb-[96px] bg-[#0D0002] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0D0002] backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full bg-transparent border-none active:scale-[0.98]"
        >
          <ArrowLeft size={30} />
        </button>
        <h2 className="text-[2.3rem]">Settings</h2>
      </div>

      <div className="px-[0.4rem]">
        {/* Report a problem */}
        <Dropdown
          label={
            <div className="flex items-center gap-[0.5rem]">
              <AlertTriangle size={18} className="opacity-70" />
              <span className="text-base">Report a problem</span>
            </div>
          }
        >
          <div className="mt-2">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe..."
              rows={4}
              className="w-full bg-transparent h-[2rem] placeholder-white/40 rounded-xl p-3 text-sm outline-none border border-white/10 focus:border-white/20"
            />
            <button
              onClick={handleSubmitReport}
              disabled={!canSubmitReport}
              className={`mt-3 w-full rounded-2xl py-3 text-sm font-medium transition 
                ${
                  canSubmitReport
                    ? "bg-white text-black active:scale-[0.99]"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
            >
              {submittingReport ? "Sending..." : "Submit"}
            </button>
          </div>
        </Dropdown>

        {/* Manage notifications (placeholder) */}
        <div className="py-4 border-t border-white/5 text-base opacity-90">
          Manage notifications
        </div>

        {/* Delete account */}
        <Dropdown
          label={
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="opacity-70" />
              <span className="text-base">Delete your account</span>
            </div>
          }
        >
          <div className="mt-2">
            <p className="text-xs text-white/60 leading-relaxed bg-[#141414] p-3 rounded-lg">
              Your account will be deactivated and you will be logged out. If
              you do not login again for 30 days, your data will be permanently
              deleted.
            </p>

            <label className="mt-3 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmDeactivate}
                onChange={(e) => setConfirmDeactivate(e.target.checked)}
                className="h-4 w-4 rounded-md accent-white"
              />
              I understand
            </label>

            <button
              onClick={handleDeactivate}
              disabled={!confirmDeactivate || deactivating}
              className={`mt-3 w-full rounded-2xl py-3 text-sm font-medium transition 
                ${
                  confirmDeactivate && !deactivating
                    ? "bg-[#2b2b2b] text-white border border-white/10 active:scale-[0.99]"
                    : "bg-white/5 text-white/40 cursor-not-allowed"
                }`}
            >
              {deactivating ? "Processing..." : "Deactivate my account"}
            </button>
          </div>
        </Dropdown>

        {/* About us */}
        <Dropdown label="About us">
          <div className="mt-2 text-[13px] leading-6 text-white/80">
            <p>
              2023–2027 batch, united by a shared vision: to build a platform
              where people can connect meaningfully and authentically. Our goal
              is to deliver a smooth, personalized experience that brings people
              together!
            </p>

            <div className="mt-3 space-y-1 text-white/70">
              <p>Our Team:</p>
              <p>
                Android Application: Prudam Priyosanga Dutta (Btech ECE
                2023–27 batch)
              </p>
              <p>
                Website: Dhritiman Saikia and Abhijit Roy (Btech CSE 2023–27
                batch)
              </p>
            </div>

            <div className="mt-3">
              <a
                href="mailto:psydriteofficial@gmail.com"
                className="underline underline-offset-4 text-white"
              >
                psydriteofficial@gmail.com
              </a>
            </div>
          </div>
        </Dropdown>

        {/* Privacy Policy (external link placeholder) */}
        <div className="py-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-base">Privacy policy</span>
          <button
            onClick={() => {
              if (PRIVACY_URL) {
                window.open(PRIVACY_URL, "_blank", "noopener,noreferrer");
              } else {
                alert("Privacy policy link coming soon.");
              }
            }}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 active:scale-[0.99]"
          >
            Open <ExternalLink size={16} />
          </button>
        </div>

        {/* Rate us (placeholder) */}
        <div className="py-4 border-t border-white/5">Rate us</div>

        {/* Logout */}
        <Dropdown
          label={
            <div className="flex items-center gap-3">
              <LogOut size={18} className="opacity-70" />
              <span className="text-base">Logout</span>
            </div>
          }
        >
          <div className="pt-3">
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl py-3 bg-[#8a1111] text-white text-sm font-medium active:scale-[0.99]"
            >
              Logout
            </button>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}


// src/mobile/pages/SettingsMobile.tsx
// import React from "react";
// import { useNavigate } from "react-router-dom";
// import { signOut } from "firebase/auth";
// import { auth } from "../../shared/utils/firebase"; // adjust path if different
// import Dropdown from "../../shared/components/DropDownicon"; // path to your Dropdown
// import { ArrowLeft } from "lucide-react"; // Lucide back arrow

// export default function SettingsMobile() {
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       navigate("/", { replace: true }); // redirect to LoginMobile
//     } catch (err) {
//       console.error("Logout failed:", err);
//     }
//   };

//   return (
    
//     <div className="flex flex-col min-h-screen min-w-screen w-full pb-[100px] bg-[#1a1919] text-white p-4">
//         <div className=" mb-4">
//             <button
//                 onClick={() => navigate(-1)} // go back
//                 className="p-2 rounded-full bg-transparent border-none transition"
//             >
//                 <ArrowLeft size={30} />
//             </button>
//             <h1 className="text-lg font-semibold ml-2">Settings</h1>
//         </div>

//       {/* Report a problem */}
//       <Dropdown label="Report a problem">
//         <div className="mb-6">
//           <textarea
//             placeholder="Describe..."
//             className="w-full bg-[#2a2929] rounded-lg p-2 text-sm"
//           />
//           <button className="mt-2 px-4 py-2 bg-gray-600 rounded-lg text-sm">
//             Submit
//           </button>
//         </div>
//       </Dropdown>

//       {/* Manage notifications */}
//       <div className="py-3 border-t border-gray-700">Manage notifications</div>

//       {/* Delete account */}
//       <Dropdown label="Delete your account">
//         <div className="py-3">
//           <p className="text-xs text-gray-400">
//             Your account will be deactivated and you will be logged out. If you do
//             not login again for 30 days, your data will be permanently deleted.
//           </p>
//           <div className="mt-2 flex items-center gap-2">
//             <input type="checkbox" id="understand" />
//             <label htmlFor="understand" className="text-xs">
//               I understand
//             </label>
//           </div>
//           <button className="mt-2 w-full px-4 py-2 bg-gray-700 rounded-lg text-sm">
//             Deactivate my account
//           </button>
//         </div>
//       </Dropdown>

//       {/* About us */}
//       <Dropdown label="About us">
//         <div className="py-4">
//           <p className="text-sm text-gray-300">
//             Hello! We are a team of developers from the TU 2023–2027 batch,
//             united by a shared vision: to build a platform where people can
//             connect meaningfully and authentically. Our goal is to deliver a
//             smooth, personalized experience that brings people together!
//           </p>
//           <p className="mt-2 text-xs text-gray-400">
//             Our Team: <br />
//             Android Application: Prudam Priyosanga Dutta (Btech ECE 2023–27 batch)
//             <br />
//             Website: Dhritiman Saikia and Abhijit Roy (Btech CSE 2023–27 batch)
//           </p>
//           <p className="mt-2 text-xs text-gray-400">
//             Contact us: psydriteofficial@gmail.com
//           </p>
//         </div>
//       </Dropdown>

//       {/* Privacy Policy */}
//       <div className="py-3 border-t border-gray-700">Privacy Policy</div>

//       {/* Rate us */}
//       <div className="py-3 border-t border-gray-700">Rate us</div>

//       {/* Logout */}
//       <Dropdown label="Logout">
//         <div className="mt-2 border-t border-gray-700 pt-4">
//           <button
//             onClick={handleLogout}
//             className="w-full px-4 py-2 bg-red-600 rounded-lg text-sm"
//           >
//             Logout
//           </button>
//         </div>
//       </Dropdown>
//     </div>
//   );
// }
