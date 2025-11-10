// src/shared/components/AuthLoader.tsx
import React from "react";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen min-w-screen items-center justify-center bg-black text-white">
        <img src="datingapp_icon.png" className="w-[3rem] h-[3rem] mt-[0.5rem]"></img>
        <div className="">
            <p className="text-[1.5rem] my-[0rem] text-[#FF5069]">Kanchanor Logori</p>
            <p className="text-[0.9rem] my-[0rem]">Unofficial dating platform TezU</p>
        </div>
    </div>
  );
}