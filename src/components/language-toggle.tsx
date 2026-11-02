"use client";

import { useI18n } from "@/i18n/context";
import { Globe } from "lucide-react";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border/80 bg-background/80 p-0.5 text-xs shadow-xs backdrop-blur-md ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-all ${
          locale === "fr"
            ? "bg-[#0ebb7c] text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Français"
      >
        <span>FR</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-all ${
          locale === "en"
            ? "bg-[#0ebb7c] text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="English"
      >
        <span>EN</span>
      </button>
    </div>
  );
}

export function LanguagePillCompact({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-secondary hover:border-[#0ebb7c]/50 ${className}`}
      title={locale === "fr" ? "Switch to English" : "Passer en Français"}
    >
      <Globe className="h-3.5 w-3.5 text-[#0ebb7c]" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}

