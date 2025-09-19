// src/shared/context/AuthContext.tsx
/*
import React, { createContext, useContext, useEffect, useState } from 'react';
// import { setAuthToken } from '../api';
import type { LoginResponse } from '../types';
import * as authService from '../services/authService';

type AuthContextType = {
  token: string | null;
  user?: any;
  loginWithBackend?: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  const loginWithBackend = async (email: string, password: string) => {
    // choose the appropriate function from authService (backend or firebase)
    const res: LoginResponse = await authService.signInBackend(email, password);
    const t = res?.token ?? (res as any).data?.token;
    if (!t) throw new Error('No token returned from backend');
    setToken(t);
    localStorage.setItem('authToken', t);
    setUser(res.user ?? (res as any).data?.user ?? null);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loginWithBackend, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
*/
/*
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../utils/firebase";

type Ctx = { user: User | null; loading: boolean };
const AuthContext = createContext<Ctx>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
*/
// // src/shared/context/AuthContext.tsx
// import React, { createContext, useContext, useEffect, useState } from "react";
// import { onAuthStateChanged } from "firebase/auth";
// import type { User } from "firebase/auth";
// import { auth } from "../utils/firebase";
// import { registerPushTokenForUser } from "../services/pushService"; // 🔑 you'll create this

// type Ctx = { user: User | null; loading: boolean };
// const AuthContext = createContext<Ctx>({ user: null, loading: true });

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       setUser(u || null);
//       setLoading(false);

//       if (u) {
//         // 🔔 Register push token once login is confirmed
//         try {
//           await registerPushTokenForUser(u.uid);
//         } catch (err) {
//           console.error("Failed to register push token:", err);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center text-white">
//         Checking session...
//       </div>
//     );
//   }

//   return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
// };

// export const useAuth = () => useContext(AuthContext);


// src/shared/context/AuthContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../utils/firebase";
import { registerPushTokenForUser } from "../services/pushService";
import { useToast } from "../components/Toast";

type Ctx = { user: User | null; loading: boolean };
const AuthContext = createContext<Ctx>({ user: null, loading: true });

// simple domain guard
const isTezuEmail = (email: string) => /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const email = u.email ?? "";

          // hard stop: non-tezu accounts are immediately signed out
          if (!isTezuEmail(email)) {
            await signOut(auth);
            setUser(null);
            push({
              message: "Only @tezu.ac.in accounts can sign in.",
              variant: "error",
            });
          } else {
            setUser(u);

            // Register push token (best-effort)
            try {
              await registerPushTokenForUser(u.uid);
            } catch (err) {
              console.error("Failed to register push token:", err);
              // not fatal; keep user signed in
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
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Checking session...
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
