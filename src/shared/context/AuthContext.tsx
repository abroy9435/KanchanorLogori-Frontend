
// src/shared/context/AuthContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../utils/firebase";
import { registerPushTokenForUser } from "../services/pushService";
import { useToast } from "../components/Toast";
import AuthLoading from "../components/AuthLoader";

type Ctx = { user: User | null; loading: boolean };
const AuthContext = createContext<Ctx>({ user: null, loading: true });

// simple domain guard
const isTezuEmail = (email: string) => /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();
  // const FORCE_LOGOUT_VERSION = "1.0.0.0";

  useEffect(() => {
    // Keep track of last processed UID so we don't react to the same event repeatedly
    const processedUidRef = { current: null as string | null };
    let pendingTimer: number | null = null;
  
    const unsub = onAuthStateChanged(auth, (u) => {
      // clear any pending timer — we'll (re)schedule below
      if (pendingTimer !== null) {
        window.clearTimeout(pendingTimer);
        pendingTimer = null;
      }
  
      // tiny debounce to allow intermediate transient auth states (common on iOS/popup)
      pendingTimer = window.setTimeout(async () => {
        try {
          // If UID hasn't changed, do nothing (prevents loops)
          const uid = u?.uid ?? null;
          if (uid === processedUidRef.current) {
            // Still change loading flag so UI doesn't hang in initial load
            setLoading(false);
            return;
          }
  
          // update processed marker
          processedUidRef.current = uid;
  
          // --- Normal Auth Logic (more robust) ---
          if (u) {
            const email = u.email ?? "";
  
            // If for some reason email is empty (transient), wait and don't force logout.
            // This avoids signing out during the temporary states some providers emit.
            if (!email) {
              console.debug("[Auth] user has no email yet - waiting", { uid });
              setUser(u);
              try {
                await registerPushTokenForUser(u.uid).catch((e) => console.debug("push token register (transient) failed", e));
              } catch (e) { /* noop */ }
              setLoading(false);
              return;
            }
  
            // Domain guard - only act when rule violated
            if (!isTezuEmail(email)) {
              console.warn("[Auth] non-tezu email detected, signing out", { email, uid });
  
              // do signOut once, but guard against loops: clear processedUid so next real login is processed
              try {
                await signOut(auth);
              } catch (err) {
                console.error("[Auth] signOut failed", err);
              } finally {
                processedUidRef.current = null; // allow subsequent legit signins
                setUser(null);
                // show only one toast for this event
                push({
                  message: "Only @tezu.ac.in accounts can sign in.",
                  variant: "error",
                });
              }
            } else {
              // Good account — store user and try register token (but don't throw)
              setUser(u);
              try {
                await registerPushTokenForUser(u.uid);
              } catch (err) {
                console.debug("Failed to register push token (non-blocking):", err);
              }
            }
          } else {
            // signed out
            processedUidRef.current = null;
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      }, 360); // 360ms debounce: tuned to let transient states settle
    });
  
    return () => {
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      unsub();
    };
  }, [push]);
  
  

  if (loading) {
    return<AuthLoading/>;
  }
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
