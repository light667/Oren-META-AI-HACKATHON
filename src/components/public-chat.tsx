"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PendingConfirmation } from "@/core/handle-message";
import { fr } from "@/i18n/fr";

interface ChatMessage {
  role: "assistant" | "customer";
  text: string;
}

interface Props {
  slug: string;
  businessName: string;
  whatsappDigits: string | null;
}

export function PublicChat({ slug, businessName, whatsappDigits }: Props) {
  // Session anonyme gardée dans le navigateur, par entreprise.
  const [anonymousId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const key = `oren-anon-${slug}`;
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = window.crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }
    return id;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: fr.chat.greeting.replace("{business}", businessName) },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [handed, setHanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [confirmed, setConfirmed] = useState<{ orderId: string; totalFcfa: number } | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payment, setPayment] = useState<"cash_on_delivery" | "cash_on_pickup">("cash_on_delivery");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, confirmed]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !anonymousId || sending || handed) return;
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "customer", text }, { role: "assistant", text: "" }]);

    const patchLast = (fn: (current: string) => string) =>
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) copy[copy.length - 1] = { ...last, text: fn(last.text) };
        return copy;
      });

    try {
      const response = await fetch(`/api/chat/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: anonymousId, text }),
      });
      if (!response.ok || !response.body) throw new Error("send failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5)) as {
            type: string;
            text?: string;
            handedToHuman?: boolean;
            pendingConfirmation?: PendingConfirmation | null;
            error?: string;
          };
          if (event.type === "delta" && event.text) {
            patchLast((current) => current + event.text);
          } else if (event.type === "done") {
            if (event.pendingConfirmation) setPending(event.pendingConfirmation);
            if (event.handedToHuman) setHanded(true);
          } else if (event.type === "error") {
            throw new Error(event.error ?? "send failed");
          }
        }
      }
    } catch {
      patchLast(() => fr.chat.loadError);
      setError(fr.chat.loadError);
    } finally {
      setSending(false);
    }
  }

  async function askHuman() {
    if (!anonymousId || handed) return;
    try {
      await fetch(`/api/chat/${slug}/human`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: anonymousId }),
      });
    } catch {
      // Même si l'appel échoue, on affiche la demande : le message suivant
      // repassera par le serveur. Le texte reste honnête côté client.
    }
    setHanded(true);
    setMessages((prev) => [...prev, { role: "assistant", text: fr.chat.humanRequested }]);
  }

  async function confirmOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!pending || !anonymousId) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      const response = await fetch(`/api/chat/${slug}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: anonymousId,
          token: pending.token,
          customerName: customer.name,
          customerPhone: customer.phone,
          paymentMethod: payment,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; orderId?: string; totalFcfa?: number; error?: string }
        | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? fr.chat.confirmError);
      setConfirmed({ orderId: data.orderId ?? "", totalFcfa: data.totalFcfa ?? pending.totalFcfa });
      setPending(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : fr.chat.confirmError);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-base font-semibold">{businessName}</h1>
          <Badge variant="secondary">{fr.chat.aiNotice}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={askHuman} disabled={handed}>
            {fr.chat.humanButton}
          </Button>
          {whatsappDigits && (
            <Button type="button" variant="outline" size="sm" render={<a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" />}>
              {fr.chat.whatsappButton}
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "customer" ? "flex justify-end" : "flex justify-start"}>
            <p
              className={
                message.role === "customer"
                  ? "max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              {message.text}
            </p>
          </div>
        ))}

        {pending && !confirmed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{fr.chat.orderCardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{pending.summary}</p>
              <form onSubmit={confirmOrder} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="cust-name">{fr.chat.customerNameLabel}</Label>
                  <Input id="cust-name" required value={customer.name} placeholder={fr.chat.customerNamePlaceholder} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cust-phone">{fr.chat.customerPhoneLabel}</Label>
                  <Input id="cust-phone" type="tel" required value={customer.phone} placeholder={fr.chat.customerPhonePlaceholder} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{fr.chat.paymentLabel}</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="payment" checked={payment === "cash_on_delivery"} onChange={() => setPayment("cash_on_delivery")} />
                    {fr.chat.paymentDelivery}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="payment" checked={payment === "cash_on_pickup"} onChange={() => setPayment("cash_on_pickup")} />
                    {fr.chat.paymentPickup}
                  </label>
                </fieldset>
                {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
                <Button type="submit" className="w-full" disabled={confirmBusy}>
                  {confirmBusy ? fr.common.loading : `${fr.chat.confirmButton} — ${pending.totalFcfa} ${fr.common.currency}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {confirmed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{fr.chat.confirmedTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{fr.chat.confirmedBody}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fr.chat.totalLabel} : {confirmed.totalFcfa} {fr.common.currency}
              </p>
            </CardContent>
          </Card>
        )}
        {error && !sending && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t px-4 py-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={fr.chat.placeholder}
          disabled={handed || !anonymousId}
          aria-label={fr.chat.placeholder}
        />
        <Button type="submit" disabled={sending || handed || !anonymousId || !draft.trim()}>
          {sending ? fr.chat.sending : fr.chat.send}
        </Button>
      </form>
    </div>
  );
}
