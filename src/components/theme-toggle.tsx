"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fr } from "@/i18n/fr";

/** Bascule clair/sombre : préférence gardée dans le navigateur. */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? fr.app.themeToLight : fr.app.themeToDark}
      title={dark ? fr.app.themeToLight : fr.app.themeToDark}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
