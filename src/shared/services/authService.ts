// src/shared/services/authService.ts
/*
import api from '../api';

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initFirebase } from '../utils/firebase'; // created in next step
initFirebase(); // ensure firebase initialized

export async function signInWithFirebase(email: string, password: string) {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();
  // send to backend to validate and exchange for backend token (if required)
  const res = await api.post('/auth/firebase', { idToken });
  return res.data; // expected { token: 'backend-token', user: {...} }
}
*/


//Temporary for without Backend Access
// src/shared/services/authService.ts
// export async function signInBackend(email: string, password: string) {
//   // TEMPORARY MOCK — replace with actual API call later
//   return new Promise<{ success: boolean; token?: string; error?: string }>((resolve) => {
//     setTimeout(() => {
//       if (email === "test@example.com" && password === "password123") {
//         resolve({ success: true, token: "mock-jwt-token" });
//       } else {
//         resolve({ success: false, error: "Invalid credentials" });
//       }
//     }, 800); // simulate network delay
//   });
// }

