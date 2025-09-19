/*
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../shared/services/userService";

export default function Gate() {
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getMyProfile();
        if (alive) navigate("/feed", { replace: true }); // existing user
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 404) {
          if (alive) navigate("/register", { replace: true }); // new user
        } else if (code === 401) {
          if (alive) navigate("/", { replace: true }); // not authenticated
        } else {
          console.error(err);
          if (alive) navigate("/error", { replace: true });
        }
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  return <div className="text-white p-8">Checking your profile…</div>;
}
*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile } from "../../shared/services/userService";
import Feed from "./feed";

export default function Gate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "feed" | "register" | "login" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getMyProfile();
        if (alive) setState("feed"); // user exists → show feed
      } catch (err: any) {
        const code = err?.response?.status;
        if (code === 404) {
          if (alive) setState("register"); // new user
        } else if (code === 401) {
          if (alive) setState("login"); // not authenticated
        } else {
          console.error(err);
          if (alive) setState("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") return <div className="text-white p-8">Checking your profile…</div>;
  if (state === "feed") return <Feed />;
  if (state === "register") {
    navigate("/register", { replace: true });
    return null;
  }
  if (state === "login") {
    navigate("/", { replace: true }); // this could be your landing/login
    return null;
  }
  if (state === "error") {
    navigate("/error", { replace: true });
    return null;
  }

  return null;
}
