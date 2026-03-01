"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "sardi-theme-mode";

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle("theme-light", mode === "light");
  root.classList.toggle("theme-dark", mode === "dark");
};

const resolveInitialTheme = (): ThemeMode => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}

export function ThemeToggleFab() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMode(resolveInitialTheme());
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    applyTheme(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-fab fixed bottom-4 right-4 z-[90] inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/45 bg-black/45 text-cyan-50 backdrop-blur md:bottom-6 md:right-6"
      aria-label={`테마 전환 (${mode === "dark" ? "라이트 모드로" : "다크 모드로"})`}
      title={mode === "dark" ? "라이트 모드" : "다크 모드"}
    >
      {mode === "dark" ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">테마 전환</span>
    </button>
  );
}
