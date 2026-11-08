"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const storageKey = "orbit-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    const preferredTheme: Theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const timer = window.setTimeout(() => {
      setTheme(preferredTheme);
      applyTheme(preferredTheme);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="orbit-theme-toggle fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
      <span>{isLight ? "Dark" : "Light"}</span>
    </button>
  );
}
