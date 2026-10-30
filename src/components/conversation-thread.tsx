"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

export interface ThreadMessage {
  id: string;
  sender_role: "customer" | "assistant" | "human" | "system";
  content: string;
  created_at: string;
}

const ROLE_LABEL: Record<ThreadMessage["sender_role"], string> = {
  customer: fr.conversations.customer,
  assistant: fr.conversations.assistantName,
  human: fr.conversations.you,
  system: fr.conversations.system,
};

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
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [paused, setPaused] = useState(initiallyPaused);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Nouveaux messages du fil en temps réel (client qui écrit, etc.).
  useEffect(() => {
    const supabase = createClient();
    // Même règle que le tableau commandes : Realtime + RLS exige le jeton.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void supabase.realtime.setAuth(data.session.access_token);
      }
    });
    const channel = supabase
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
    return () => {
      void supabase.removeChannel(channel);
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
      if (!response.ok) throw new Error(fr.common.error);
      setDraft("");
      setPaused(true); // Répondre met l'assistant en pause sur ce fil.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/resume`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(fr.common.error);
      setPaused(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {paused && <Badge variant="secondary">{fr.conversations.pausedBadge}</Badge>}
        {paused && (
          <Button type="button" size="sm" variant="outline" onClick={resume}>
            {fr.conversations.resumeAssistant}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.sender_role === "customer" ? "flex justify-start" : "flex justify-end"}
          >
            <div
              className={
                message.sender_role === "customer"
                  ? "max-w-[85%] rounded-lg bg-muted px-3 py-2"
                  : "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
              }
            >
              <p className="text-xs opacity-70">{ROLE_LABEL[message.sender_role]}</p>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={reply} className="flex gap-2 border-t pt-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={fr.conversations.replyPlaceholder}
          aria-label={fr.conversations.replyPlaceholder}
        />
        <Button type="submit" disabled={busy || !draft.trim()}>
          {fr.conversations.reply}
        </Button>
      </form>
    </div>
  );
}
