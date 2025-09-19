"use client";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Compass, PlusCircle, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../shared/utils/firebase";

type LayoutProps = {
  children: ReactNode;
};

export default function DesktopLayout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { name: "Feed", path: "/feed", icon: <Home size={20} /> },
    { name: "Discover", path: "/discover", icon: <Compass size={20} /> },
    { name: "Post", path: "/post", icon: <PlusCircle size={20} /> },
  ];
  
  

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
        <div>
          <div className="p-4 text-2xl font-bold text-pink-500">Kanchanor</div>
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  location.pathname === item.path
                    ? "bg-pink-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4">
          <button
            onClick={() => signOut(auth).then(() => (window.location.href = "/"))}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
