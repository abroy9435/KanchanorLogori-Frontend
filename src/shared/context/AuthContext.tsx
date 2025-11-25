// // src/shared/context/AuthContext.tsx
// "use client";
// import React, { createContext, useContext, useEffect, useRef, useState } from "react";
// import { onAuthStateChanged, signOut, type User } from "firebase/auth";
// import { auth } from "../utils/firebase";
// import { registerPushTokenForUser } from "../services/pushService";
// import { useToast } from "../components/Toast";
// import AuthLoading from "../components/AuthLoader";

// type Ctx = { user: User | null; loading: boolean };
// const AuthContext = createContext<Ctx>({ user: null, loading: true });

// // Domain guard
// const isTezuEmail = (email?: string | null) =>
//   !!email && /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);
//   const { push } = useToast();

//   /** Tracks last processed UID to prevent loops */
//   const lastUidRef = useRef<string | null>(null);

//   /** Ensures toast appears only once for invalid domain */
//   const warnedRef = useRef(false);

//   /** Debounce timer to allow iOS popup-transient states to settle */
//   const debounceRef = useRef<number | null>(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (firebaseUser) => {
//       // Clear previous debounce
//       if (debounceRef.current) {
//         clearTimeout(debounceRef.current);
//       }

//       // Debounce → avoid reacting to transient states from Google popup, esp. iOS
//       debounceRef.current = window.setTimeout(async () => {
//         const uid = firebaseUser?.uid ?? null;

//         // Prevent reprocessing same UID
//         if (uid === lastUidRef.current) {
//           setLoading(false);
//           return;
//         }

//         lastUidRef.current = uid;

//         try {
//           if (!firebaseUser) {
//             // User signed out
//             lastUidRef.current = null;
//             warnedRef.current = false;
//             setUser(null);
//             return;
//           }

//           /** Handle transient state: user exists but email not loaded yet */
//           if (!firebaseUser.email) {
//             console.debug(
//               "[Auth] Email not yet available — transient Google state. Waiting..."
//             );
//             setUser(firebaseUser);
//             setLoading(false);
//             return;
//           }

//           const email = firebaseUser.email;

//           /** Domain validation */
//           if (!isTezuEmail(email)) {
//             console.warn("[Auth] Invalid domain detected:", email);

//             if (!warnedRef.current) {
//               warnedRef.current = true;
//               push({
//                 message: "Only @tezu.ac.in accounts can sign in.",
//                 variant: "error",
//               });
//             }

//             try {
//               await signOut(auth);
//             } catch (err) {
//               console.error("SignOut error:", err);
//             }

//             lastUidRef.current = null;
//             setUser(null);
//             return;
//           }

//           /** Valid account → set user */
//           setUser(firebaseUser);

//           /** Attempt push token registration (non-blocking) */
//           try {
//             await registerPushTokenForUser(firebaseUser.uid);
//           } catch (err) {
//             console.debug("Push token register failed (ignored):", err);
//           }
//         } finally {
//           setLoading(false);
//         }
//       }, 350); // 300–400ms is ideal to avoid iOS popup transient loops
//     });

//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//       unsub();
//     };
//   }, [push]);

//   if (loading) return <AuthLoading />;

//   return (
//     <AuthContext.Provider value={{ user, loading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);


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

const isTezuEmail = (email: string) =>
  /^[^@\s]+@tezu\.ac\.in$/i.test(email.trim());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    let debounceTimer: number | null = null;
    const processedUidRef = { current: null as string | null };

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = window.setTimeout(async () => {
        try {
          const uid = firebaseUser?.uid ?? null;

          // skip duplicate events
          if (uid === processedUidRef.current) {
            setLoading(false);
            return;
          }

          processedUidRef.current = uid;

          if (firebaseUser) {
            const email = firebaseUser.email ?? "";

            if (!email) {
              setUser(firebaseUser);
              setLoading(false);
              return;
            }

            // domain guard
            if (!isTezuEmail(email)) {
              try {
                await signOut(auth);
              } catch {}

              processedUidRef.current = null;
              setUser(null);

              push({
                message: "Only @tezu.ac.in accounts can sign in.",
                variant: "error",
              });

              setLoading(false);
              return;
            }

            // valid user
            setUser(firebaseUser);

            try {
              await registerPushTokenForUser(firebaseUser.uid);
            } catch (err) {
              console.debug("Push token failed:", err);
            }

          } else {
            processedUidRef.current = null;
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      }, 300);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsub();
    };
  }, [push]);

  if (loading) return <AuthLoading />;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
