"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { fr } from "@/i18n/fr";

/** Bascule clair/sombre : préférence gardée dans le navigateur. Bouton natif léger (aucune bibliothèque) pour garder les pages rapides. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() =>
    typeof document === "undefined"
      ? true
      : document.documentElement.classList.contains("dark"),
  );

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("oren-theme", next ? "dark" : "light");
    } catch {
      // Stockage indisponible : la bascule vaut pour cette page.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? fr.app.themeToLight : fr.app.themeToDark}
      title={dark ? fr.app.themeToLight : fr.app.themeToDark}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
