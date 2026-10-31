"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { fr } from "@/i18n/fr";

const SCRIPT = fr.landing.demoPhone.messages;

/**
 * TÃ©lÃ©phone de dÃ©monstration : la conversation se joue toute seule,
 * en boucle, avec indicateur d'Ã©criture. Aucune donnÃ©e rÃ©elle,
 * aucun appel rÃ©seau â€” c'est une illustration du vrai chat.
 */
export function DemoPhone() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          step();
        }, 4200);
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
          step();
        }, 1100);
      } else {
        timer = window.setTimeout(() => {
          if (cancelled) return;
          index += 1;
          setVisibleCount(index);
          step();
        }, 700);
      }
    };
    step();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, typing]);

  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2rem] border bg-card p-2 shadow-[var(--shadow-lift)]">
      <div className="flex h-[480px] flex-col overflow-hidden rounded-[1.6rem] bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <LogoMark className="h-7 w-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fr.landing.demoPhone.business}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden />
              {fr.landing.demoPhone.open}
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{fr.landing.demoPhone.demoBadge}</span>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3" aria-live="off">
          {SCRIPT.slice(0, visibleCount).map((message, i) => (
            <div key={i} className={message.from === "client" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={
                  message.from === "client"
                    ? "oren-rise max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "oren-rise max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm"
                }
              >
                {message.text}
              </p>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start" role="status" aria-label={fr.landing.demoPhone.typing}>
              <p className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-3 py-2.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="oren-typing-dot h-1.5 w-1.5 rounded-full bg-foreground"
                    style={{ animationDelay: `${dot * 180}ms` }}
                  />
                ))}
              </p>
            </div>
          )}
        </div>
        <div className="border-t px-3 py-2.5">
          <p className="rounded-full bg-muted px-3 py-2 text-sm text-muted-foreground">{fr.chat.placeholder}</p>
        </div>
      </div>
    </div>
  );
}
