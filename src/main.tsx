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

// --- Manual SW registration (prod vs dev) ---
if ('serviceWorker' in navigator) {
  const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
  navigator.serviceWorker
    .register(swUrl, { type: import.meta.env.DEV ? 'module' : 'classic' })
    .then(async (reg) => {
      await navigator.serviceWorker.ready;
      // optional: kick off push only after the SW is ready
      if ('Notification' in window && Notification.permission === 'granted') {
        const { initPush } = await import('./shared/utils/push');
        const token = await initPush();
        if (token) console.log('[FCM] token:', token);
      }
    })
    .catch((err) => console.error('SW registration failed:', err));
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
