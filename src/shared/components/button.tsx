import { cn } from "../utils/misc";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost";
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const base =
    "px-4 py-2 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    default: "bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500",
    ghost: "bg-transparent text-gray-400 hover:text-white focus:ring-gray-500",
  };

  return (
    <button
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};
