"use client";

import { useEffect, useState } from "react";
import { DemoPhone } from "@/components/demo-phone";

/**
 * Monte le téléphone de démonstration seulement après le chargement
 * complet de la page : son animation ne bloque jamais l'affichage.
 */
export function DemoPhoneMount() {
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
        className="mx-auto h-[500px] w-full max-w-[340px] rounded-[2rem] border bg-card"
        aria-hidden
      />
    );
  }
  return <DemoPhone />;
}
