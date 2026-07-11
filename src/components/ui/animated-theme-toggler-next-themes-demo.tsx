"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";

export function AnimatedThemeTogglerNextThemesDemo() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a hollow block skeleton of the same size to prevent SSR flashes
    return (
      <div className="size-9 border border-zinc-800 bg-zinc-950/40 rounded-none animate-pulse" />
    );
  }

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onThemeChange={setTheme}
    />
  );
}
