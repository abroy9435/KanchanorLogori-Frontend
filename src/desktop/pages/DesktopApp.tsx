// src/desktop/pages/DesktopApp.tsx
/*
import React from "react";
import { Routes, Route } from "react-router-dom";

import Login from "./Login";
import Feed from "./feed";
import Discover from "./discover";
import Post from "./post";
import Register from "./Register";
import Gate from "./Gate";

import ProtectedRoute from "../../shared/routes/Protectedroute";

export default function DesktopApp() {
  return (
    <Routes>
      {/* Public route *}
      <Route path="/" element={<Login />} />

      {/* Protected routes *}
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <Discover />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post"
        element={
          <ProtectedRoute>
            <Post />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute>
            <Register />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gate"
        element={
          <ProtectedRoute>
            <Gate />
          </ProtectedRoute>
        }
      />

      {/* Catch-all *}
      <Route path="*" element={<div className="p-8 text-white">Not Found</div>} />
    </Routes>
  );
}
*/

// src/desktop/pages/DesktopApp.tsx
// src/desktop/pages/DesktopApp.tsx
// src/desktop/pages/DesktopApp.tsx
import React from "react";
import AppRoute from "../../shared/routes/AppRoutes";

export default function DesktopApp() {
  return <AppRoute isMobile={false} />;
}

