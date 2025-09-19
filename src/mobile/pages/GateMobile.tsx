// src/mobile/pages/GateMobile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../shared/services/userService";
import { useAuth } from "../../shared/context/AuthContext";

export default function GateMobile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"loading" | "feed" | "register" | "login" | "error">("loading");

  useEffect(() => {
    let alive = true;

    // Don’t fetch until auth is resolved
    if (loading) return;
    if (!user) {
      setStatus("login");
      return;
    }

    (async () => {
      try {
        await getMyProfile();
        if (alive) setStatus("feed"); // user exists → go feed
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 404) {
          if (alive) setStatus("register");
        } else if (code === 401) {
          if (alive) setStatus("login");
        } else {
          console.error(err);
          if (alive) setStatus("error");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, loading]);

  useEffect(() => {
    if (status === "feed") navigate("/feed", { replace: true });
    if (status === "register") navigate("/register", { replace: true });
    if (status === "login") navigate("/", { replace: true });
    if (status === "error") navigate("/error", { replace: true });
  }, [status, navigate]);

  if (status === "loading") {
    return <div className="text-white p-8 flex justify-center items-center w-screen h-screen">Checking your profile…</div>;
  }

  return null;
}

