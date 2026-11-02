"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/context";

/**
 * Bascule clair / sombre moderne et accessible.
 * Thème clair : Blanc + Vert (#0ebb7c).
 * Thème sombre : Noir (#09090b) + Vert (#0ebb7c).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("oren-theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
  }

  if (!mounted) {
    return (
      <div
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-muted-foreground ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t.app.themeToLight : t.app.themeToDark}
      title={isDark ? t.app.themeToLight : t.app.themeToDark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/60 text-foreground transition-all duration-200 hover:border-[#0ebb7c]/50 hover:bg-secondary hover:text-[#0ebb7c] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
