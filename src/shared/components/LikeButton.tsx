// // LikeButton.tsx
// import { useState } from "react";
// import { Heart } from "lucide-react";
// import { HeartAnimation } from "./HeartAnimation";

// type LikeButtonProps = {
//   liked?: boolean; // initial liked state from parent
//   onToggle?: () => void; // optional callback when liked
// };

// export function LikeButton({ liked: initialLiked = false, onToggle }: LikeButtonProps) {
//   const [liked, setLiked] = useState(initialLiked);
//   const [showHeart, setShowHeart] = useState(false);

//   const handleLike = async () => {
//     if (liked) return; // cannot unlike
//     setLiked(true);
//     setShowHeart(true);

//     if (onToggle) await onToggle(); // call parent handler if provided

//     // Hide the floating heart after animation
//     setTimeout(() => setShowHeart(false), 1200);
//   };

//   return (
//     <div className="relative inline-block">
//       <button
//         onClick={handleLike}
//         className={"flex items-center px-[10px] py-[10px] border-none bg-[#413839] rounded-full transition-colors"}
//       >
//         <Heart size={24} fill={liked? "#FE0000" : "#413839"} className={`mt-2 px-4 py-2 rounded transition-colors
//         ${liked ? "text-[#FF0000]" : "text-black"} bg-[#413839]`} />
//       </button>

//       <HeartAnimation
//         trigger={showHeart}
//         size={60}
//         duration={1200}
//       />
//     </div>

//   );
// }

// LikeButton.tsx
import { useState } from "react";
import { Heart } from "lucide-react";
import { HeartAnimation } from "./HeartAnimation";

type LikeButtonProps = {
  liked?: boolean;
  onToggle?: () => void;
};

export function LikeButton({ liked: initialLiked = false, onToggle }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [showHeart, setShowHeart] = useState(false);

  const handleLike = async () => {
    if (liked) return; // cannot unlike
    setLiked(true);

    // trigger heart animation
    setShowHeart(false);
    setTimeout(() => setShowHeart(true), 10);

    if (onToggle) await onToggle(); // notify parent
  };

  return (
    <div className="relative inline-block mr-[5px]">
       <button
         onClick={handleLike}
         className={"flex items-center px-[10px] py-[10px] mr-[0.75rem] ml-[0.5rem] border-none bg-[#413839] rounded-full transition-colors"}
       >
         <Heart size={24} fill={liked? "#FF0000" : "#1F0004"} className={`mt-2 px-4 py-2 rounded transition-colors
         ${liked ? "text-[#FF0000]" : "text-[#1F0004]"} bg-[#413839]`} />
      </button>
    </div>
  );
}
