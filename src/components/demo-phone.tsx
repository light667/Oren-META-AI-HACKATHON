"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { BadgeCheck, CheckCircle2, ChevronLeft, Phone, Send, Sparkles } from "lucide-react";

/**
 * Téléphone de démonstration : rejoue une vraie conversation de commande
 * (question, récapitulatif calculé, « oui » explicite, confirmation).
 * Remonté par la page à chaque changement de langue (key={locale}).
 */
export function DemoPhone({ className }: { className?: string }) {
  const { t } = useI18n();
  const phone = t.landing.demoPhone;
  const script = phone.messages;

  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmed = visibleCount >= 5;

  useEffect(() => {
    let cancelled = false;
    let index = 0;
    let timer = 0;

    const step = () => {
      if (cancelled) return;
      if (index >= script.length) {
        timer = window.setTimeout(() => {
          if (cancelled) return;
          index = 0;
          setVisibleCount(0);
          setTyping(false);
          step();
        }, 6000);
        return;
      }
      const fromAssistant = script[index].from === "assistant";
      if (fromAssistant) setTyping(true);
      timer = window.setTimeout(
        () => {
          if (cancelled) return;
          setTyping(false);
          index += 1;
          setVisibleCount(index);
          step();
        },
        fromAssistant ? 1400 : 1000,
      );
    };

    timer = window.setTimeout(step, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [script]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, typing]);

  return (
    <div className={cn("relative mx-auto w-full max-w-[340px] select-none", className)}>
      <div className="relative rounded-[3rem] bg-zinc-900 p-[10px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55),0_0_0_1px_rgb(255_255_255/0.06)_inset] ring-1 ring-zinc-700/60 dark:bg-zinc-950">
        {/* Boutons latéraux */}
        <span className="absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-zinc-700" aria-hidden />
        <span className="absolute -left-[3px] top-44 h-14 w-[3px] rounded-l bg-zinc-700" aria-hidden />
        <span className="absolute -right-[3px] top-36 h-16 w-[3px] rounded-r bg-zinc-700" aria-hidden />

        <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[2.4rem] bg-background">
          {/* Barre d'état + îlot */}
          <div className="relative flex items-center justify-between px-7 pb-1 pt-3 text-[11px] font-semibold text-foreground">
            <span>12:45</span>
            <span className="absolute left-1/2 top-2.5 h-6 w-24 -translate-x-1/2 rounded-full bg-zinc-950" aria-hidden />
            <span className="flex items-center gap-1" aria-hidden>
              <span className="flex items-end gap-px">
                {[3, 5, 7, 9].map((h) => (
                  <span key={h} className="w-[3px] rounded-sm bg-foreground" style={{ height: h }} />
                ))}
              </span>
              <span className="ml-1 h-2.5 w-5 rounded-[3px] border border-foreground/70 p-px">
                <span className="block h-full w-3/4 rounded-[1px] bg-foreground" />
              </span>
            </span>
          </div>

          {/* En-tête de conversation */}
          <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
            <ChevronLeft className="h-5 w-5 text-brand" aria-hidden />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LogoMark className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[13px] font-semibold leading-tight">
                {phone.business}
                <BadgeCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
              </p>
              <p className="text-[10.5px] text-muted-foreground">
                <span className="font-medium text-brand">{phone.open}</span> · Lomé
              </p>
            </div>
            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>

          {/* Mention IA (transparence) */}
          <div className="flex justify-center px-3 pt-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-brand" />
              {phone.aiNotice}
            </span>
          </div>

          {/* Fil */}
          <div
            ref={scrollRef}
            className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[12.5px]"
            aria-hidden
          >
            {script.slice(0, visibleCount).map((message, i) => {
              const client = message.from === "client";
              return (
                <div key={i} className={client ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={cn(
                      "oren-rise max-w-[84%] px-3.5 py-2 leading-relaxed shadow-xs",
                      client
                        ? "rounded-[18px] rounded-br-md bg-brand text-brand-foreground"
                        : "rounded-[18px] rounded-bl-md bg-muted text-foreground",
                    )}
                  >
                    <p>{message.text}</p>
                    {i === 3 && (
                      <div className="mt-2.5 overflow-hidden rounded-xl border border-border/70 bg-background text-[11px]">
                        <div className="space-y-1 p-2.5">
                          <div className="flex justify-between">
                            <span>{phone.summaryItem}</span>
                            <span className="tabular-nums">{phone.summaryItemPrice}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{phone.summaryDelivery}</span>
                            <span className="tabular-nums">{phone.summaryDeliveryPrice}</span>
                          </div>
                          <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
                            <span>{phone.summaryTotal}</span>
                            <span className="tabular-nums text-brand">{phone.summaryTotalPrice}</span>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex items-center justify-center gap-1 py-1.5 font-semibold transition-colors duration-500",
                            confirmed
                              ? "bg-brand text-brand-foreground"
                              : "bg-brand-soft text-brand",
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {confirmed ? phone.confirmed : t.chat.confirmButton}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[18px] rounded-bl-md bg-muted px-3.5 py-3">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="oren-typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${dot * 160}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saisie */}
          <div className="border-t border-border/60 px-3 pb-5 pt-2.5">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card py-1.5 pl-4 pr-1.5 text-[12px] text-muted-foreground">
              <span className="flex-1 truncate">{t.chat.placeholder}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Send className="h-3.5 w-3.5" />
              </span>
            </div>
            <span className="mx-auto mt-3 block h-1 w-28 rounded-full bg-foreground/80" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
