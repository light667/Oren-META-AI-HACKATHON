"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/context";

/** Thème courant = classe "dark" sur <html> (posée avant rendu par le layout). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Bascule clair / sombre, mémorisée dans le navigateur. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => null,
  );

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("oren-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : le thème vaut pour cette page seulement
    }
  }

  if (isDark === null) {
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/60 text-foreground transition-all duration-200 hover:border-brand/50 hover:bg-secondary hover:text-brand active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
