"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { fr } from "./fr";
import { en } from "./en";

export type Locale = "fr" | "en";
export type Translations = typeof fr;

const STORAGE_KEY = "oren-locale";
const EVENT = "oren-locale-change";

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

// Français par défaut : produit pensé pour l'Afrique francophone (AGENTS.md).
const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  setLocale: () => {},
  t: fr,
});

function readLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "fr" as Locale);

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      // stockage indisponible : la langue reste celle par défaut
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const t = (locale === "en" ? en : fr) as unknown as Translations;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
