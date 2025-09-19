// import React from "react";
// import { Link, useLocation, Outlet } from "react-router-dom";
// import {
//   Home,
//   User,
//   PlusSquare,
//   HeartIcon,
//   MessageCircle,
// } from "lucide-react";

// export default function MobileLayout() {
//   const location = useLocation();

//   const isActive = (path: string) =>
//     location.pathname.startsWith(path)
//       ? "text-[#000000] bg-[#FF5069] rounded-full group nav-select py-[15px]"
//       : "text-gray-400";

//   return (
//     <div className="min-h-screen w-full bg-black text-white flex flex-col">
//       {/* Main scrollable content */}
//       <div className="flex-1 min-w-screen overflow-x-hidden overflow-y-auto pb-[5rem]">
//         <Outlet />
//       </div>

//       {/* Fixed Bottom nav */}
//       <nav
//         className="fixed bottom-[0px] left-[0px] w-full h-16 bg-black py-[10px] flex items-center justify-around z-50"
//         style={{ backgroundColor: "#000000" }}
//       >
//         <Link
//           to="/profile"
//           className={`flex-1 mx-[8px] flex flex-col items-center ${isActive("/profile")}`}
//         >
//           <User size={20} className="scale-110 group-[.nav-select]:scale-125" />
//           <span className="group-[.nav-select]:hidden text-xs">Profile</span>
//         </Link>

//         <Link
//           to="/post"
//           className={`flex-1 mx-[8px] flex flex-col items-center ${isActive("/post")}`}
//         >
//           <PlusSquare size={18} className="scale-110 group-[.nav-select]:scale-125" />
//           <span className="group-[.nav-select]:hidden text-xs">Post</span>
//         </Link>

//         <Link
//           to="/feed"
//           className={`flex-1 mx-[8px] flex flex-col items-center ${isActive("/feed")}`}
//         >
//           <Home size={24} className="scale-110 group-[.nav-select]:scale-125" />
//           <span className="group-[.nav-select]:hidden text-xs">Home</span>
//         </Link>

//         <Link
//           to="/discover"
//           className={`flex-1 mx-[8px] flex flex-col items-center ${isActive("/discover")}`}
//         >
//           <HeartIcon size={20} className="scale-110 group-[.nav-select]:scale-125" />
//           <span className="group-[.nav-select]:hidden text-xs">Discover</span>
//         </Link>

//         <Link
//           to="/chats"
//           className={`flex-1 mx-[8px] flex flex-col items-center ${isActive("/chats")}`}
//         >
//           <MessageCircle size={20} className="scale-110 group-[.nav-select]:scale-125" />
//           <span className="group-[.nav-select]:hidden text-xs">Chats</span>
//         </Link>
//       </nav>
//     </div>
//   );
// }

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  User,
  PlusSquare,
  HeartIcon,
  MessageCircle,
  type LucideIcon, // <-- important
} from "lucide-react";

type Tab = {
  path: string;
  label: string;
  Icon: LucideIcon; // <-- use LucideIcon so `size` prop is allowed
  size: number;
};

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // define tabs once (order matters)
  const tabs: Tab[] = useMemo(
    () => [
      { path: "/profile",  label: "Profile",  Icon: User,         size: 20 },
      { path: "/post",     label: "Post",     Icon: PlusSquare,   size: 18 },
      { path: "/feed",     label: "Home",     Icon: Home,         size: 24 },
      { path: "/discover", label: "Discover", Icon: HeartIcon,    size: 20 },
      { path: "/chats",    label: "Chats",    Icon: MessageCircle, size: 20 },
    ],
    []
  );

  // active tab index from route
  const activeIndex = useMemo(() => {
    const i = tabs.findIndex((t) => location.pathname.startsWith(t.path));
    return i >= 0 ? i : 0;
  }, [location.pathname, tabs]);

  // bubble position as percentage buckets (0%, 100%, 200%...)
  const [x, setX] = useState(activeIndex * 100);
  const bubbleWidthPct = 100 / tabs.length; // 20% for 5 tabs

  useEffect(() => {
    setX(activeIndex * 100);
  }, [activeIndex]);

  // optional: keep bubble aligned on rotate/resize
  useEffect(() => {
    const onResize = () => setX(activeIndex * 100);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex]);

  return (
    <div className="min-h-screen w-full bg-[#0D0002] text-white flex flex-col">
      {/* Main scrollable content */}
      <div className="flex-1 min-w-screen overflow-x-hidden overflow-y-auto pb-[5rem]">
        <Outlet />
      </div>

      {/* Fixed Bottom nav */}
      <nav
        className="fixed bottom-[0px] left-[0px] w-full h-16 z-50"
        style={{ backgroundColor: "#0D0002" }}
      >
        {/* Track */}
        <div className="relative h-full px-[8px] flex items-center justify-between">
          {/* Pink bubble */}
          <div
            aria-hidden
            className="absolute left-[8px] right-[8px] top-[50%] -translate-y-1/2 pointer-events-none"
          >
            <div
              className="
                h-[46px] rounded-full bg-[#FF5069]
                transition-transform duration-300 ease-out
                shadow-[0_0.2rem_0.8rem_rgba(255,80,105,0.35)]
              "
              style={{
                width: `${bubbleWidthPct}%`,
                transform: `translateX(${x}%)`,
              }}
            />
          </div>

          {/* Tabs */}
          <div className="relative z-10 grid grid-cols-5 w-full h-[4rem]">
            {tabs.map((t, idx) => {
              const selected = idx === activeIndex;
              const Icon = t.Icon;
              return (
                <button
                  key={t.path}
                  onClick={() => navigate(t.path)}
                  className="relative mx-[8px] flex flex-col items-center bg-transparent border-none justify-center h-full select-none"
                >
                  <Icon
                    size={t.size} // now valid
                    className={`transition-transform duration-200 ${
                      selected ? "scale-160 text-[#000000] pt-[0.6rem]" : "scale-110 text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs mt-[2px] transition-opacity ${
                      selected ? "opacity-0" : "opacity-100 text-gray-400"
                    }`}
                  >
                    {t.label}
                  </span>

                  {/* focus ring for a11y (keyboard users) */}
                  <span className="absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5069]/80" />
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
