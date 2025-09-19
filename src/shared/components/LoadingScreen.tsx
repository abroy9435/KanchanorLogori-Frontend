// src/shared/components/LoadingScreen.tsx
import React from "react";

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
      <div className="animate-pulse text-xl font-semibold">
        Loading...
      </div>
    </div>
  );
}
