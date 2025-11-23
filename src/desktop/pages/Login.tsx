// src/desktop/pages/Login.tsx
import React, { useState } from 'react';
import { useEffect } from "react";
// import Input from '../components/Input';
// import Button from '../components/Button';
// import { useAuth } from '../../shared/context/AuthContext';
import { auth, provider } from "../../shared/utils/firebase"; 
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import {motion} from "framer-motion";
import Lottie from "lottie-react";

export default function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comingSoonAnim, setComingSoonAnim] = useState<any>(null);

  useEffect(() => {
    fetch("/comingsoon_lottie.json")
      .then((res) => res.json())
      .then((data) => setComingSoonAnim(data))
      .catch((err) =>
        console.error("Failed to load Lottie JSON", err)
      );
  }, []);

  const handleLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: "tezu.ac.in", // restrict to university GSuite domain
      });

      const result = await signInWithPopup(auth, provider);
      console.log("User:", result.user);

      // redirect after login
      window.location.href = "/gate";
    } catch (error: any) {
      setErr(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  return(
    <div className="bg-gradient-to-t from-[#1F0004] to-black w-screen h-screen flex flex-col items-center justify-center">
      <div className="overflow-hidden bg-[#0D0002] max-w-[35rem] rounded-[2rem] px-[1.5rem] py-[1rem] flex items-center justify-center shadow-[6px_6px_20px_0_#FF5069]">
              {comingSoonAnim ? (
                <div className="object-contain">
                    <div className="flex px-[0.5rem]">
                    <Lottie
                    animationData={comingSoonAnim}
                    loop
                    autoplay
                    className="rounded-md"
                    />
                    <div className="text-[#FF5069]  flex flex-col items-center justify-center ">
                      <h3 className="text-[2.5rem] !my-[0rem]">COMING</h3>
                      <h3 className="text-[2.5rem] !my-[0rem]">SOON!</h3>
                    </div>
                  </div>
                  <p className="text-center text-[1.3rem]">The desktop version of this site will be available soon. Switch to a mobile device/viewport to use it now</p>
                </div>
                
                  ) : (
                <div className="text-white/50 text-sm italic">Loading animation…</div>
              )}
    </div>
    </div>
  )
  //actual return block
//  return(

//   <div className="bg-gradient-to-t from-[#1F0004] to-black w-screen h-screen flex flex-col items-center justify-center">
//     <div className="flex items-center justify-center">
//       <div className="h-full flex items-center justify-center">
//         <img src="../../../public/loginpage_art.png" alt="image" className="w-32"/>
//       </div>
//       <div className="flex flex-col justify-center items-center">
//         <h1 className='text-[#FF5069]'>Ready to meet someone special?</h1>
//         <h3>Continue with your University GSUIT ID. Your Partner is a few clicks away!</h3>
//         <div className="w-full flex items-center justify-center">
//             {/* <button className="flex items-center justify-center w-full h-full text-[#FF5069] rounded-lg">
//             Let's Go
//             </button>  */}
//           <button
//             onClick={handleLogin}
//             disabled={loading}
//             className="flex items-center justify-center h-full gap-3 text-[#FF5069] px-6 py-3 bg-[#000000] border-[#FF5069] cursor-pointer rounded-full shadow-lg hover:bg-gray-100 transition w-[500px]"
//           >
//             <img
//               src="../../public/google_icon.png"
//               alt="Google logo"
//               className="w-[30px] h-[50px] object-contain mx-[10px]"
//             />
//             {loading ? "Signing in..." : "Sign in with Google"}
//           </button>
//         </div>
//       </div>
//     </div>
//   </div>
//  )
}
