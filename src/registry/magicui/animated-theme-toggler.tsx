"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export type TransitionVariant = "circle" | "square";

interface AnimatedThemeTogglerProps {
  className?: string;
  duration?: number;
  variant?: TransitionVariant;
  fromCenter?: boolean;
  theme?: "light" | "dark";
  onThemeChange?: (theme: "light" | "dark") => void;
}

export const AnimatedThemeToggler: React.FC<AnimatedThemeTogglerProps> = ({
  className = "",
  duration = 0,
  variant = "circle",
  fromCenter = false,
  theme = "dark",
  onThemeChange,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    if (onThemeChange) {
      onThemeChange(theme === "dark" ? "light" : "dark");
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center size-9 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white rounded-none transition-colors cursor-pointer focus:outline-none ${className}`}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ rotate: 0, scale: 1, opacity: 1 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0 }}
            className="flex items-center justify-center"
          >
            <Moon className="size-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 0, scale: 1, opacity: 1 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0 }}
            className="flex items-center justify-center"
          >
            <Sun className="size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
