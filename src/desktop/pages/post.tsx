// src/desktop/pages/post.tsx
import React from "react";
import DesktopLayout from "../layouts/DesktopLayout";

export default function Post() {
  return (
    <DesktopLayout>
    <div className="p-6">
    <div className="p-8 text-white w-screen h-screen flex flex-col justify-center items-center">
      <h1 className="text-2xl font-bold">Post</h1>
      <p className="mt-2 text-gray-400">This is the Post page. Content coming soon…</p>
    </div>
    </div>
 </DesktopLayout>
  );
}
