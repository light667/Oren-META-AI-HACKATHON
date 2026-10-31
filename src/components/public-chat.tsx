"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Check } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PendingConfirmation } from "@/core/handle-message";
import { fr } from "@/i18n/fr";
import { formatFcfa } from "@/lib/format";

const ChatMenu = dynamic(() => import("@/components/chat-menu").then((m) => m.ChatMenu));

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  priceFcfa: number;
  category: string;
  available: boolean;
}

interface ChatMessage {
  role: "assistant" | "customer";
  text: string;
}

interface Props {
  slug: string;
  businessName: string;
  whatsappDigits: string | null;
  menuItems: PublicMenuItem[];
  isOpen: boolean;
  todayHours: string | null;
}

function resolveAnonymousId(slug: string): string {
  const key = `oren-anon-${slug}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = window.crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

const TRACKING_STEPS = ["confirmed", "accepted", "preparing", "ready", "delivered"] as const;

// Ã‰lÃ©ments natifs lÃ©gers (page publique rapide sur tÃ©lÃ©phone d'entrÃ©e de gamme).
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const btnOutline =
  "inline-flex items-center justify-center rounded-xl border bg-background font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const inputCls =
  "flex w-full rounded-xl border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function PublicChat({
  slug,
  businessName,
  whatsappDigits,
  menuItems,
  isOpen,
  todayHours,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: fr.chat.greeting.replace("{business}", businessName) },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [handed, setHanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [confirmed, setConfirmed] = useState<{
    orderId: string;
    totalFcfa: number;
    status: string;
    lines: { name: string; quantity: number; priceFcfa: number }[];
  } | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payment, setPayment] = useState<"cash_on_delivery" | "cash_on_pickup">("cash_on_delivery");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ item, quantity: cart[item.id] ?? 0 })),
    [cart, menuItems],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, confirmed]);

  // Suivi de commande sans recharger la page.
  useEffect(() => {
    if (!confirmed) return;
    if (confirmed.status === "delivered" || confirmed.status === "cancelled") return;
    const anonymousId = resolveAnonymousId(slug);
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/chat/${slug}/order-status?sessionId=${encodeURIComponent(anonymousId)}&orderId=${encodeURIComponent(confirmed.orderId)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { status?: string };
        if (data.status) {
          setConfirmed((prev) => (prev ? { ...prev, status: data.status ?? prev.status } : prev));
        }
      } catch {
        // Prochain essai au prochain tic.
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [confirmed, slug]);

  function changeQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = Math.max(0, (next[itemId] ?? 0) + delta);
      if (qty === 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  }

  async function sendText(text: string) {
    if (!text || sending || handed) return;
    const anonymousId = resolveAnonymousId(slug);
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
      if (!response.ok || !response.body) {
        // Limite atteinte ou erreur : message clair, en franÃ§ais.
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? fr.chat.loadError);
      }
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
            throw new Error(event.error ?? fr.chat.loadError);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : fr.chat.loadError;
      patchLast(() => message);
      setError(message);
    } finally {
      setSending(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendText(text);
  }

  function orderFromCart() {
    if (cartLines.length === 0) return;
    const lines = cartLines
      .map((l) => `${l.quantity} Ã— ${l.item.name}`)
      .join(", ");
    void sendText(`Je voudrais commander : ${lines}.`);
  }

  async function askHuman() {
    if (handed) return;
    const anonymousId = resolveAnonymousId(slug);
    try {
      await fetch(`/api/chat/${slug}/human`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: anonymousId }),
      });
    } catch {
      // Le message suivant repassera par le serveur.
    }
    setHanded(true);
    setMessages((prev) => [...prev, { role: "assistant", text: fr.chat.humanRequested }]);
  }

  async function confirmOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;
    const anonymousId = resolveAnonymousId(slug);
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
      setConfirmed({
        orderId: data.orderId ?? "",
        totalFcfa: data.totalFcfa ?? pending.totalFcfa,
        status: "confirmed",
        lines: cartLines.map((l) => ({
          name: l.item.name,
          quantity: l.quantity,
          priceFcfa: l.item.priceFcfa,
        })),
      });
      setPending(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : fr.chat.confirmError);
    } finally {
      setConfirmBusy(false);
    }
  }

  function orderAgain() {
    setConfirmed(null);
    setPending(null);
    menuRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const stepIndex =
    confirmed && confirmed.status !== "cancelled"
      ? Math.max(0, TRACKING_STEPS.indexOf(confirmed.status as (typeof TRACKING_STEPS)[number]))
      : -1;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label={fr.chat.backHome} className={`${btnGhost} h-10 w-10`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <LogoMark className="h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{businessName}</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${isOpen ? "bg-[var(--success)]" : "bg-destructive"}`}
                aria-hidden
              />
              {isOpen ? fr.chat.openNow : fr.chat.closedNow}
              {todayHours ? ` Â· ${todayHours}` : ""}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {fr.chat.aiNotice} â€” {fr.chat.aiHumanNote}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={`${btnOutline} h-9 px-3 text-sm`}
            onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            {fr.chat.chipMenu}
          </button>
          <button
            type="button"
            className={`${btnOutline} h-9 px-3 text-sm`}
            onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            {fr.chat.chipOrder}
          </button>
          <button
            type="button"
            className={`${btnOutline} h-9 px-3 text-sm`}
            onClick={() => void sendText("Quels sont vos horaires et vos zones de livraison ?")}
          >
            {fr.chat.chipHours}
          </button>
          <button type="button" className={`${btnOutline} h-9 px-3 text-sm`} onClick={askHuman} disabled={handed}>
            {fr.chat.humanButton}
          </button>
          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnGhost} h-9 px-3 text-sm`}
            >
              {fr.chat.whatsappButton}
            </a>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">

        <ChatMenu
          menuItems={menuItems}
          cart={cart}
          onChangeQty={changeQty}
          onClear={() => setCart({})}
          onOrder={orderFromCart}
          disableOrder={sending || handed || Boolean(confirmed)}
          menuRef={menuRef}
        />

        {/* Conversation */}
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isLastAssistant =
              index === messages.length - 1 && message.role === "assistant";
            return (
              <div key={index} className={message.role === "customer" ? "flex justify-end" : "flex justify-start"}>
                {isLastAssistant && sending && message.text === "" ? (
                  <p className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-3 py-2.5" role="status" aria-label={fr.chat.typing}>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="oren-typing-dot h-1.5 w-1.5 rounded-full bg-foreground"
                        style={{ animationDelay: `${dot * 180}ms` }}
                      />
                    ))}
                  </p>
                ) : (
                  <p
                    className={
                      message.role === "customer"
                        ? "oren-rise max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-base text-primary-foreground"
                        : "oren-rise max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-base"
                    }
                  >
                    {message.text}
                  </p>
                )}
              </div>
            );
          })}

          {pending && !confirmed && (
            <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <h2 className="font-heading text-base font-bold">{fr.chat.orderCardTitle}</h2>
              <div className="space-y-4 pt-3">
                <p className="whitespace-pre-wrap text-sm leading-6">{pending.summary}</p>
                <p className="text-base font-bold">
                  {fr.chat.totalLabel} : {formatFcfa(pending.totalFcfa)}
                </p>
                <form onSubmit={confirmOrder} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="cust-name" className="text-sm font-medium">{fr.chat.customerNameLabel}</label>
                    <input id="cust-name" required value={customer.name} placeholder={fr.chat.customerNamePlaceholder} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} h-11`} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="cust-phone" className="text-sm font-medium">{fr.chat.customerPhoneLabel}</label>
                    <input id="cust-phone" type="tel" required value={customer.phone} placeholder={fr.chat.customerPhonePlaceholder} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))} className={`${inputCls} h-11`} />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">{fr.chat.paymentLabel}</legend>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="radio" name="payment" checked={payment === "cash_on_delivery"} onChange={() => setPayment("cash_on_delivery")} />
                      {fr.chat.paymentDelivery}
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="radio" name="payment" checked={payment === "cash_on_pickup"} onChange={() => setPayment("cash_on_pickup")} />
                      {fr.chat.paymentPickup}
                    </label>
                  </fieldset>
                  {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
                  <button type="submit" className={`${btnPrimary} h-12 w-full text-base`} disabled={confirmBusy}>
                    {confirmBusy ? fr.common.loading : `${fr.chat.confirmButton} â€” ${formatFcfa(pending.totalFcfa)}`}
                  </button>
                </form>
              </div>
            </div>
          )}

          {confirmed && (
            <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold">
                <Check className="h-5 w-5 text-[var(--success)]" aria-hidden />
                {fr.chat.confirmedTitle}
              </h2>
              <div className="space-y-4 pt-3">
                <p className="text-sm">{fr.chat.confirmedBody}</p>
                <div>
                  <h3 className="pb-2 text-sm font-semibold">{fr.chat.trackingTitle}</h3>
                  {confirmed.status === "cancelled" ? (
                    <p className="text-sm font-medium text-destructive">{fr.orders.status.cancelled}</p>
                  ) : (
                    <ol className="space-y-0">
                      {TRACKING_STEPS.map((step, i) => {
                        const done = i <= stepIndex;
                        return (
                          <li key={step} className="flex gap-3">
                            <span className="flex flex-col items-center">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  done ? "bg-[var(--success)] text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                              </span>
                              {i < TRACKING_STEPS.length - 1 && (
                                <span className={`h-5 w-0.5 ${done ? "bg-[var(--success)]" : "bg-muted"}`} />
                              )}
                            </span>
                            <span className={`pb-4 text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>
                              {fr.orders.status[step]}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
                {confirmed.lines.length > 0 && (
                  <div className="rounded-xl bg-muted p-3">
                    <h3 className="pb-1.5 text-sm font-semibold">{fr.chat.receiptTitle}</h3>
                    <ul className="space-y-1 text-sm">
                      {confirmed.lines.map((line, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span>
                            {line.quantity} Ã— {line.name}
                          </span>
                          <span>{formatFcfa(line.priceFcfa * line.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="flex justify-between border-t pt-1.5 text-sm font-bold">
                      <span>{fr.chat.totalLabel}</span>
                      <span>{formatFcfa(confirmed.totalFcfa)}</span>
                    </p>
                  </div>
                )}
                <button type="button" className={`${btnOutline} h-11 w-full`} onClick={orderAgain}>
                  {fr.chat.orderAgain}
                </button>
              </div>
            </div>
          )}
          {error && !sending && <p className="text-center text-sm text-destructive">{error}</p>}
        </div>
      </div>


      <form onSubmit={send} className="flex gap-2 border-t px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={fr.chat.placeholder}
          disabled={handed}
          aria-label={fr.chat.placeholder}
          className={`${inputCls} h-11`}
        />
        <button type="submit" className={`${btnPrimary} h-11 px-4`} disabled={sending || handed || !draft.trim()}>
          {sending ? fr.chat.sending : fr.chat.send}
        </button>
      </form>
      <p className="flex items-center justify-center gap-1.5 border-t py-2 text-xs text-muted-foreground">
        {fr.app.poweredBy} <LogoMark className="h-4 w-4" /> {fr.app.title.toLowerCase()}
      </p>
    </div>
  );
}
