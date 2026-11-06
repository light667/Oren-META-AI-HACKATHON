"use client";

import { useEffect, useState } from "react";
import { DemoPhone } from "@/components/demo-phone";
import { useI18n } from "@/i18n/context";

/**
 * Monte le téléphone de démonstration après le chargement complet de la
 * page : son animation ne retarde jamais l'affichage. Un changement de
 * langue remonte le composant (la conversation repart de zéro).
 */
export function DemoPhoneMount({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLoad = () => setReady(true);
    if (document.readyState === "complete") {
      const timer = window.setTimeout(onLoad, 0);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  if (!ready) {
    return (
      <div
        className="mx-auto h-[620px] w-full max-w-[340px] rounded-[3rem] bg-zinc-900/90"
        aria-hidden
      />
    );
  }
  return <DemoPhone key={locale} className={className} />;
}
