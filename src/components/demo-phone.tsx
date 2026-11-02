"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { useI18n } from "@/i18n/context";
import { CheckCircle2, Send, Wifi, Battery, Sparkles } from "lucide-react";

/**
 * Téléphone de démonstration interactif au design épuré (style iPhone / Android moderne).
 * Démontre la fluidité, le récapitulatif avec total en FCFA et la confirmation en direct.
 */
export function DemoPhone() {
  const { t, locale } = useI18n();
  const SCRIPT = t.landing.demoPhone.messages;

  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Réinitialiser la séquence si la langue change
  useEffect(() => {
    setVisibleCount(0);
    setTyping(false);
    setConfirmed(false);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    let index = 0;
    let timer: number;

    const step = () => {
      if (cancelled) return;
      if (index >= SCRIPT.length) {
        timer = window.setTimeout(() => {
          if (cancelled) return;
          index = 0;
          setVisibleCount(0);
          setTyping(false);
          setConfirmed(false);
          step();
        }, 5000);
        return;
      }

      const message = SCRIPT[index];
      if (message.from === "assistant") {
        setTyping(true);
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setTyping(false);
          index += 1;
          setVisibleCount(index);
          if (index === 4) {
            setConfirmed(true);
          }
          step();
        }, 1100);
      } else {
        timer = window.setTimeout(() => {
          if (cancelled) return;
          index += 1;
          setVisibleCount(index);
          step();
        }, 800);
      }
    };

    const initialTimer = window.setTimeout(step, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(initialTimer);
    };
  }, [SCRIPT]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [visibleCount, typing]);

  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none">
      {/* Halo lumineux arrière-plan */}
      <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-tr from-[#0ebb7c]/30 to-emerald-400/10 blur-xl" />

      {/* Châssis smartphone moderne */}
      <div className="relative rounded-[2.6rem] border-[4px] border-zinc-300 bg-zinc-950 p-2 shadow-2xl shadow-zinc-950/30 dark:border-zinc-800">
        <div className="flex h-[520px] flex-col overflow-hidden rounded-[2rem] bg-background">
          {/* Dynamic Island / Barre de statut */}
          <div className="flex items-center justify-between border-b border-border/40 bg-secondary/40 px-5 py-2 text-[11px] font-semibold text-muted-foreground">
            <span>12:45</span>
            <div className="h-3 w-16 rounded-full bg-zinc-900 dark:bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              <Battery className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* En-tête de conversation */}
          <div className="flex items-center gap-2.5 border-b border-border/60 bg-card px-3.5 py-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#0ebb7c]/10 text-[#0ebb7c]">
              <LogoMark className="h-5 w-5" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-[#0ebb7c] animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold leading-tight text-foreground">
                {t.landing.demoPhone.business}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0ebb7c]" />
                <span className="font-medium text-[#0ebb7c]">{t.landing.demoPhone.open}</span> • Lomé
              </p>
            </div>
            
          </div>

          {/* Fil de discussion */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-2.5 overflow-y-auto p-3.5 text-xs"
            aria-live="off"
          >
            {SCRIPT.slice(0, visibleCount).map((message, i) => (
              <div
                key={i}
                className={message.from === "client" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    message.from === "client"
                      ? "oren-rise max-w-[85%] rounded-2xl rounded-tr-xs bg-[#0ebb7c] px-3.5 py-2 text-white shadow-xs"
                      : "oren-rise max-w-[88%] rounded-2xl rounded-tl-xs border border-border/60 bg-card px-3.5 py-2 text-foreground shadow-xs"
                  }
                >
                  <p className="leading-relaxed">{message.text}</p>

                  {/* Carte interactive pour le récapitulatif */}
                  {i === 3 && (
                    <div className="mt-2.5 rounded-xl border border-border/80 bg-background/80 p-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                        <span>2x Attiéké Poulet</span>
                        <span className="text-[#0ebb7c]">4 500 FCFA</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Livraison Agoè</span>
                        <span>Inclus</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center rounded-lg bg-[#0ebb7c] py-1 text-[11px] font-bold text-white shadow-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {confirmed ? "Confirmé" : t.chat.confirmButton}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-xs border border-border/60 bg-card px-3.5 py-2.5 shadow-xs">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="oren-typing-dot h-1.5 w-1.5 rounded-full bg-[#0ebb7c]"
                      style={{ animationDelay: `${dot * 180}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barre de saisie fictive */}
          <div className="border-t border-border/60 bg-card p-2.5">
            <div className="flex items-center justify-between rounded-full border border-border/80 bg-background px-3.5 py-2 text-xs text-muted-foreground">
              <span className="truncate">{t.chat.placeholder}</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0ebb7c] text-white">
                <Send className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
