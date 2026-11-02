"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fr } from "./fr";
import { en } from "./en";

export type Locale = "fr" | "en";
export type Translations = typeof fr;

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: fr,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("oren-locale") as Locale | null;
      if (saved === "en" || saved === "fr") {
        setLocaleState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("oren-locale", l);
      document.documentElement.lang = l;
    } catch {
      // ignore
    }
  };

  const t = (locale === "en" ? en : fr) as unknown as Translations;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

