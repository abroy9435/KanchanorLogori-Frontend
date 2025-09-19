// import React from 'react'

// src/App.tsx
// src/App.tsx
import React from "react";
import DesktopApp from "./desktop/pages/DesktopApp";
import MobileApp from "./mobile/pages/MobileApp";
import { useDevice } from "./shared/hooks/useDevice";
import { useAuth } from "./shared/context/AuthContext";

export default function App() {
  const { isMobile } = useDevice();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        <div className="animate-pulse text-xl">Checking session...</div>
      </div>
    );
  }

  return isMobile ? <MobileApp /> : <DesktopApp />;
}


