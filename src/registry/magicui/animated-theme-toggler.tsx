"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { flushSync } from "react-dom";

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
  duration = 400,
  variant = "circle",
  fromCenter = false,
  theme = "dark",
  onThemeChange,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    if (!onThemeChange) return;
    const nextTheme = theme === "dark" ? "light" : "dark";

    // Fallback if View Transitions API is not supported in the user's browser
    if (!document.startViewTransition) {
      onThemeChange(nextTheme);
      return;
    }

    // Determine the transition epicenter
    let x = e.clientX;
    let y = e.clientY;
    if (fromCenter) {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    } else if (buttonRef.current && x === 0 && y === 0) {
      const rect = buttonRef.current.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        onThemeChange(nextTheme);
      });
    });

    transition.ready.then(() => {
      const clipPath =
        variant === "square"
          ? [
              `inset(50% 50% 50% 50%)`,
              `inset(0% 0% 0% 0%)`,
            ]
          : [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

      document.documentElement.animate(
        {
          clipPath: theme === "dark" ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: duration,
          easing: "ease-in-out",
          pseudoElement: theme === "dark" ? "::view-transition-old(root)" : "::view-transition-new(root)",
        }
      );
    });
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
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Moon className="size-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Sun className="size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
