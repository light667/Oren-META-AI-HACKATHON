"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";
import { MessageSquare, ArrowRight, AlertCircle, Clock } from "lucide-react";

export interface InboxItem {
  id: string;
  channel: string;
  status: string;
  assistant_paused: boolean;
  updated_at: string;
  preview: string;
}

export function ConversationInbox({ items }: { items: InboxItem[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | "handoff">("all");

  const visible = items.filter((i) =>
    filter === "all" ? true : i.status === "a_reprendre" || i.assistant_paused,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t.conversations.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.conversations.description}</p>
        </div>

        {/* Filtres */}
        <div className="inline-flex rounded-full border border-border/70 bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-[#0ebb7c] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.conversations.filterAll}
          </button>
          <button
            type="button"
            onClick={() => setFilter("handoff")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filter === "handoff"
                ? "bg-[#0ebb7c] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.conversations.filterHandoff}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {filter === "handoff" ? t.conversations.emptyFiltered : t.conversations.empty}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const isHandoff = item.status === "a_reprendre";
            return (
              <li key={item.id}>
                <Link
                  href={`/app/conversations/${item.id}`}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all duration-200 hover:shadow-md ${
                    isHandoff
                      ? "border-amber-500/60 ring-1 ring-amber-500/20"
                      : "border-border/70 hover:border-[#0ebb7c]/50"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                        {item.channel}
                      </span>
                      <span className="text-[11px] text-muted-foreground">•</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.updated_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isHandoff && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          {t.conversations.handoffBadge}
                        </span>
                      )}
                      {item.assistant_paused && (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {t.conversations.pausedBadge}
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-2 text-xs sm:text-sm text-foreground/85 leading-relaxed font-normal">
                      {item.preview || "Nouvelle conversation"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-border/80 bg-secondary/50 px-3 text-xs font-semibold text-foreground transition-colors group-hover:bg-[#0ebb7c] group-hover:text-white group-hover:border-[#0ebb7c]">
                      <span>{t.conversations.open}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
