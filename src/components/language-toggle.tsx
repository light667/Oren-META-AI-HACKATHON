"use client";

import { useI18n } from "@/i18n/context";
import { Globe } from "lucide-react";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-lg border-2 border-ink bg-card p-0.5 text-xs ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-all ${
          locale === "fr"
            ? "bg-brand text-brand-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Français"
      >
        <span>FR</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-all ${
          locale === "en"
            ? "bg-brand text-brand-foreground shadow-xs"
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
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-secondary hover:border-brand/50 ${className}`}
      title={locale === "fr" ? "Switch to English" : "Passer en Français"}
    >
      <Globe className="h-3.5 w-3.5 text-brand" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}

