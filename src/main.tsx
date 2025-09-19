// // src/main.tsx
// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import { AuthProvider } from "./shared/context/AuthContext";
// import App from "./App"; // ✅ use App.tsx (handles desktop vs mobile)
// import "./index.css";
// import { ToastProvider } from "./shared/components/Toast";
// // import { RemoveScrollBar } from 'react-remove-scroll-bar';

// import ErrorBoundary from "./shared/ErrorBoundary";
// import AppRoutes from "./shared/routes/AppRoutes";
// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     // vite-plugin-pwa will generate /sw.js — this registers it
//     navigator.serviceWorker.register("/sw.js").catch(console.error);
//   });
// }

// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <React.StrictMode>
//     <ToastProvider>
//       <ErrorBoundary>
//         <AuthProvider>
//           <BrowserRouter>
//             <AppRoutes />
//           </BrowserRouter>
//         </AuthProvider>
//       </ErrorBoundary>
//     </ToastProvider>
//   </React.StrictMode>
// );



// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext";
import "./index.css";
import { ToastProvider } from "./shared/components/Toast";
import ErrorBoundary from "./shared/ErrorBoundary";
import AppRoutes from "./shared/routes/AppRoutes";

// 🔔 Push (FCM) bootstrap
// import { initPush } from "./shared/utils/push"; // uses the Messaging instance exported by firebase.ts

// --- Manual SW registration (dev vs prod) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
      await navigator.serviceWorker.register(swUrl, {
        type: import.meta.env.DEV ? "module" : "classic",
      });

      await navigator.serviceWorker.ready;

      // Only init push if already GRANTED. Otherwise, wait for user action.
      if ("Notification" in window && Notification.permission === "granted") {
        const { initPush } = await import("./shared/utils/push");
        const token = await initPush();
        if (token) console.log("[FCM] token:", token);
      } else {
        console.log(
          "[PUSH] Not requesting permission automatically. " +
          "Trigger requestPermissionAndInit() from a user action (e.g. a Settings button)."
        );
        // Expose a helper for quick testing (optional)
        (window as any).requestPush = async () => {
          const { requestPermissionAndInit } = await import("./shared/utils/push");
          const token = await requestPermissionAndInit();
          console.log("[PUSH] token:", token);
        };
      }
    } catch (err) {
      console.error("ServiceWorker registration / push init failed:", err);
    }
  });
}



ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ToastProvider>
  </React.StrictMode>
);
