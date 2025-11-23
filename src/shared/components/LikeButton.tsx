//src/shared/components/LikeButton.tsx
import { useState } from "react";
import { Heart } from "lucide-react";
import { HeartAnimation } from "./HeartAnimation";

type LikeButtonProps = {
  liked: boolean;
  onToggle: () => Promise<boolean>;
};

export function LikeButton({ liked, onToggle }: LikeButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    if (liked) return; // cannot unlike

    // ---- INSTANT UI FEEDBACK ----
    // setAnimating(true);
    // setTimeout(() => setAnimating(false), 1000);

    // Ask parent to like (optimistic + rollback)
    await onToggle();
  };

  return (
    <div className="relative inline-block mr-[5px]">
      {/* {animating && (
        <div className="absolute inset-[0rem] flex items-center justify-center pointer-events-none">
          <HeartAnimation trigger={true} size={120} />
        </div>
      )} */}

      <button
        onClick={handleClick}
        className="flex items-center px-[10px] py-[10px] mr-[0.75rem] ml-[0.5rem] border-none bg-[#413839] rounded-full"
      >
        <Heart
          size={24}
          fill={liked ? "#FF5069" : "#1F0004"}
          className={`transition-colors ${
            liked ? "text-[#FF5069]" : "text-[#1F0004]"
          }`}
        />
      </button>
    </div>
  );
}

