
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
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        // --- Normal Auth Logic ---
        if (u) {
          const email = u.email ?? "";
  
          // --- iOS FIX: Google returns null/empty email for 300–800ms ---
          // Avoid force logout until email is actually available.
          if (!email) {
            setUser(u);
            return; // wait for next onAuthStateChanged tick
          }
  
          // --- Domain Check ---
          if (!isTezuEmail(email)) {
            await signOut(auth);
            setUser(null);
            push({
              message: "Only @tezu.ac.in accounts can sign in.",
              variant: "error",
            });
          } else {
            setUser(u);
  
            try {
              await registerPushTokenForUser(u.uid);
            } catch (err) {
              console.error("Failed to register push token:", err);
            }
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });
  
    return () => unsub();
  }, [push]);
  

  if (loading) {
    return<AuthLoading/>;
  }
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
