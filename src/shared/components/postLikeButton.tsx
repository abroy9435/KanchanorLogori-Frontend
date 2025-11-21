//src/shared/components/postLikeButton.tsx
import { useState } from "react";
import { Heart } from "lucide-react";
import { HeartAnimation } from "./HeartAnimation";

type LikeButtonProps = {
  liked?: boolean;
  onToggle?: () => void;
};

export function PostLikeButton({ liked: initialLiked = false, onToggle }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [showHeart, setShowHeart] = useState(false);

  const handleLike = async () => {
    // allow toggle ON and OFF
    const newState = !liked;
    setLiked(newState);

    // heart animation only when liking (not unliking)
    if (newState === true) {
      setShowHeart(false);
      setTimeout(() => setShowHeart(true), 10);
    }

    if (onToggle) await onToggle(); // callback to parent
  };

  return (
    <div className="relative inline-block mr-[5px]">
      <button
        onClick={handleLike}
        className={"flex items-center px-[10px] py-[10px] mr-[0.75rem] ml-[0.5rem] border-none bg-[#413839] rounded-full transition-colors"}
      >
        <Heart
          size={24}
          fill={liked ? "#1F0004" : "#1F0004"} //change the true state color to #FF0000 when like button is fully functional
          className={`mt-2 px-4 py-2 rounded transition-colors
          ${liked ? "text-[#1F0004]" : "text-[#1F0004]"} bg-[#413839]`} //change the true state color to #FF0000 when like button is fully functional
        />
      </button>
    </div>
  );
}
