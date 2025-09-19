import { useEffect, useRef } from "react";
import lottie from "lottie-web";

interface HeartAnimationProps {
  trigger: boolean;
  size?: number;
  duration?: number;
}

export function HeartAnimation({
  trigger,
  size = 200,   // relative size of animation
  duration = 1200,
}: HeartAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger && containerRef.current) {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: "/heart.json", // your lottie file
      });

      const timer = setTimeout(() => {
        anim.destroy();
      }, duration);

      return () => {
        clearTimeout(timer);
        anim.destroy();
      };
    }
  }, [trigger, duration]);

  if (!trigger) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-[10rem] left-1/2 -translate-x-1/2 w-full h-full pointer-events-none"
      style={{ width: size, height: size }}
    />
  );
}
