// // src/shared/components/LoadingScreen.tsx
// import React from "react";

// export default function LoadingScreen() {
//   return (
//     <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
//       <div className="animate-pulse text-xl font-semibold">
//         Loading...
//       </div>
//     </div>
//   );
// }
// src/shared/components/LoadingScreen.tsx
import React from "react";
import { motion} from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="flex gap-[0.5rem] items-center justify-center h-screen w-screen bg-black text-white">

      {/* Text */}
      <div className="animate-pulse text-lg italic">
        Loading matches
      </div>
      {/* Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-[0.6rem] h-[0.6rem] border-[0.3rem] border-[#FF5069] border-t-transparent rounded-full"
      />
    </div>
  );
}

