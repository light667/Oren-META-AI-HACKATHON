"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send, RotateCcw, Bot, User, ShieldAlert, AlertCircle } from "lucide-react";

export interface ThreadMessage {
  id: string;
  sender_role: "customer" | "assistant" | "human" | "system";
  content: string;
  created_at: string;
}

export function ConversationThread({
  conversationId,
  businessId,
  initialMessages,
  initiallyPaused,
}: {
  conversationId: string;
  businessId: string;
  initialMessages: ThreadMessage[];
  initiallyPaused: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();

  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [paused, setPaused] = useState(initiallyPaused);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime messages subscription
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      if (cancelled) return;
      channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const next = payload.new as ThreadMessage;
            setMessages((current) =>
              current.some((m) => m.id === next.id) ? current : [...current, next],
            );
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, businessId]);

  async function reply(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error(t.common.error);
      setDraft("");
      setPaused(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/resume`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(t.common.error);
      setPaused(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-120px)] flex-col rounded-3xl border border-border/70 bg-card overflow-hidden shadow-xs">
      {/* En-tête de conversation */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/app/conversations"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Conversation #{conversationId.slice(0, 8)}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {paused ? (
                <span className="text-amber-500 font-semibold">{t.conversations.pausedBadge}</span>
              ) : (
                <span className="text-[#0ebb7c] font-semibold">Assistant IA actif</span>
              )}
            </p>
          </div>
        </div>

        {paused && (
          <Button
            type="button"
            size="sm"
            onClick={resume}
            disabled={busy}
            className="h-8 rounded-xl bg-[#0ebb7c] px-3 text-xs font-bold text-white hover:bg-[#0ca66e]"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t.conversations.resumeAssistant}
          </Button>
        )}
      </div>

      {/* Fil de discussion */}
      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm">
        {messages.map((message) => {
          const isCustomer = message.sender_role === "customer";
          const isHuman = message.sender_role === "human";
          const isAssistant = message.sender_role === "assistant";
          const isSystem = message.sender_role === "system";

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center my-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground border border-border/60">
                  {message.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isHuman ? "items-end" : "items-start"}`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                {isAssistant && <Bot className="h-3 w-3 text-[#0ebb7c]" />}
                {isHuman && <User className="h-3 w-3 text-primary" />}
                <span className="font-semibold">
                  {isHuman
                    ? t.conversations.you
                    : isAssistant
                      ? t.conversations.assistantName
                      : t.conversations.customer}
                </span>
                <span>•</span>
                <span>
                  {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs ${
                  isHuman
                    ? "rounded-tr-xs bg-[#0ebb7c] text-white"
                    : isCustomer
                      ? "rounded-tl-xs bg-secondary text-foreground"
                      : "rounded-tl-xs border border-border/80 bg-card text-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre de saisie de réponse */}
      <form onSubmit={reply} className="border-t border-border/60 bg-secondary/20 p-3.5">
        {error && (
          <div className="mb-2 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.conversations.replyPlaceholder}
            className="h-10 flex-1 rounded-xl bg-background border-border/80 text-xs sm:text-sm"
          />
          <Button
            type="submit"
            disabled={busy || !draft.trim()}
            className="h-10 rounded-xl bg-[#0ebb7c] px-4 font-bold text-white hover:bg-[#0ca66e]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
