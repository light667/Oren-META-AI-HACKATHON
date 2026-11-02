"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  UtensilsCrossed,
  ShoppingBag,
  X,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { useI18n } from "@/i18n/context";
import { formatFcfa } from "@/lib/format";
import { ChatMenu } from "@/components/chat-menu";

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

interface PendingConfirmation {
  orderDraftToken: string;
  summary: string;
  totalFcfa: number;
  items: { name: string; quantity: number; priceFcfa: number }[];
  deliveryFeeFcfa: number;
  neighborhood: string;
}

interface Props {
  slug: string;
  businessName: string;
  whatsappDigits: string | null;
  menuItems: PublicMenuItem[];
  isOpen: boolean;
  todayHours: string | null;
}

const TRACKING_STEPS = ["confirmed", "accepted", "preparing", "ready", "delivered"] as const;

export function PublicChat({
  slug,
  businessName,
  whatsappDigits,
  menuItems,
  isOpen,
  todayHours,
}: Props) {
  const { t } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: t.chat.greeting.replace("{business}", businessName) },
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
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ item, quantity: cart[item.id] ?? 0 })),
    [cart, menuItems],
  );

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.item.priceFcfa * line.quantity, 0),
    [cartLines],
  );

  const cartCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, confirmed]);

  // Suivi de commande sans recharger la page
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
        // Polling en silence
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [confirmed, slug]);

  function changeCartQty(itemId: string, delta: number) {
    setCart((prev) => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  }

  function orderFromCart() {
    if (cartLines.length === 0) return;
    const prompt = `Je souhaite commander : ${cartLines
      .map((line) => `${line.quantity} × ${line.item.name}`)
      .join(", ")}. Pouvez-vous préparer le récapitulatif ?`;
    void sendText(prompt);
    setShowMenu(false);
  }

  async function sendText(textToSend: string) {
    const text = textToSend.trim();
    if (!text || sending || handed) return;

    setDraft("");
    setError(null);
    setMessages((prev) => [...prev, { role: "customer", text }]);
    setSending(true);

    const sessionId = resolveAnonymousId(slug);

    try {
      const response = await fetch(`/api/chat/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (response.status === 429) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.chat.rateLimitBlocked);
        setSending(false);
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? t.common.error);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t.common.error);

      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          try {
            const data = JSON.parse(payload) as Record<string, unknown>;
            if (typeof data.delta === "string") {
              assistantText += data.delta;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.text = assistantText;
                }
                return next;
              });
            }
            if (data.pendingConfirmation) {
              setPending(data.pendingConfirmation as PendingConfirmation);
            }
            if (data.handedOver) {
              setHanded(true);
            }
          } catch {
            // fragment non-JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setSending(false);
    }
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    void sendText(draft);
  }

  async function askHuman() {
    await sendText("Je souhaite parler à un responsable humain.");
  }

  async function confirmOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;
    setConfirmBusy(true);
    setConfirmError(null);

    const sessionId = resolveAnonymousId(slug);

    try {
      const response = await fetch(`/api/chat/${slug}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderDraftToken: pending.orderDraftToken,
          customerName: customer.name,
          customerPhone: customer.phone,
          paymentMethod: payment,
          sessionId,
        }),
      });

      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        throw new Error((data?.error as string) ?? t.common.error);
      }

      setConfirmed({
        orderId: String(data?.orderId ?? ""),
        totalFcfa: Number(data?.totalFcfa ?? pending.totalFcfa),
        status: String(data?.status ?? "confirmed"),
        lines: pending.items,
      });
      setPending(null);
      setCart({});
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setConfirmBusy(false);
    }
  }

  function orderAgain() {
    setConfirmed(null);
    setPending(null);
    setShowMenu(true);
  }

  const stepIndex =
    confirmed && confirmed.status !== "cancelled"
      ? Math.max(0, TRACKING_STEPS.indexOf(confirmed.status as (typeof TRACKING_STEPS)[number]))
      : -1;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* En-tête compact sur UNE SEULE LIGNE (Tâche D5 : retour, logo et nom, statut, thème) */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label={t.chat.backHome}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <LogoMark className="h-6 w-6 text-[#0ebb7c]" />

          <span className="truncate font-heading text-sm font-bold text-foreground">
            {businessName}
          </span>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isOpen
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-primary animate-pulse" : "bg-destructive"
              }`}
            />
            <span>{isOpen ? t.chat.openNow : t.chat.closedNow}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>

      {/* Puces d'actions rapides sous forme de rangée défilante unique + mention IA */}
      <div className="shrink-0 border-b border-border/40 bg-secondary/20 px-3 py-1.5">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-secondary active:scale-95"
            onClick={() => setShowMenu(true)}
          >
            <UtensilsCrossed className="h-3 w-3 text-primary" />
            <span>{t.chat.chipMenu}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-secondary active:scale-95"
            onClick={() => void sendText("Je souhaite passer commande. Que proposez-vous ?")}
          >
            <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            <span>Passer commande</span>
          </button>

          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-secondary active:scale-95"
            onClick={() => void sendText("Quels sont vos horaires et vos zones de livraison ?")}
          >
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{t.chat.chipHours}</span>
          </button>

          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-secondary disabled:opacity-50 active:scale-95"
            onClick={askHuman}
            disabled={handed}
          >
            <User className="h-3 w-3 text-muted-foreground" />
            <span>{t.chat.humanButton}</span>
          </button>

          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#25d366]/40 bg-[#25d366]/10 px-3 text-xs font-semibold text-[#25d366] transition-all hover:bg-[#25d366]/20 active:scale-95"
            >
              <MessageSquare className="h-3 w-3" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>

        {/* Mention assistant IA courte et discrète */}
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Assistant IA · Vous pouvez demander un humain à tout moment
        </p>
      </div>

      {/* Corps du chat avec message d'accueil en premier */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scroll-smooth"
      >
        {/* Fil de discussion */}
        {messages.map((message, index) => {
          const isLastAssistant = index === messages.length - 1 && message.role === "assistant";
          return (
            <div
              key={index}
              className={message.role === "customer" ? "flex justify-end" : "flex justify-start"}
            >
              {isLastAssistant && sending && message.text === "" ? (
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-border/60 bg-card px-4 py-3 shadow-xs">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-2 w-2 rounded-full bg-primary animate-oren-dot-1"
                      style={{ animationDelay: `${dot * 180}ms` }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={
                    message.role === "customer"
                      ? "animate-oren-rise max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-xs bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-xs"
                      : "animate-oren-rise max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-xs border border-border/70 bg-card px-4 py-2.5 text-sm text-foreground shadow-xs"
                  }
                >
                  {message.text}
                </div>
              )}
            </div>
          );
        })}

        {/* Carte de récapitulatif & Confirmation par jeton unique */}
        {pending && !confirmed && (
          <div className="animate-oren-rise overflow-hidden rounded-3xl border border-primary/50 bg-card p-5 shadow-xl shadow-primary/10">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">
                {t.chat.orderCardTitle}
              </h2>
            </div>

            <div className="space-y-4 pt-3.5">
              <div className="rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
                {pending.summary}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm font-bold text-primary">
                <span>{t.chat.totalLabel}</span>
                <span className="text-base">{formatFcfa(pending.totalFcfa)}</span>
              </div>

              <form onSubmit={confirmOrder} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="cust-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.chat.customerNameLabel}
                  </label>
                  <input
                    id="cust-name"
                    required
                    value={customer.name}
                    placeholder={t.chat.customerNamePlaceholder}
                    onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cust-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.chat.customerPhoneLabel}
                  </label>
                  <input
                    id="cust-phone"
                    required
                    type="tel"
                    value={customer.phone}
                    placeholder={t.chat.customerPhonePlaceholder}
                    onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.chat.paymentLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      className={`h-9 rounded-xl border font-semibold transition-all ${
                        payment === "cash_on_delivery"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 bg-background text-muted-foreground"
                      }`}
                      onClick={() => setPayment("cash_on_delivery")}
                    >
                      {t.chat.paymentDelivery}
                    </button>
                    <button
                      type="button"
                      className={`h-9 rounded-xl border font-semibold transition-all ${
                        payment === "cash_on_pickup"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 bg-background text-muted-foreground"
                      }`}
                      onClick={() => setPayment("cash_on_pickup")}
                    >
                      {t.chat.paymentPickup}
                    </button>
                  </div>
                </div>

                {confirmError && (
                  <p className="text-xs text-destructive">{confirmError}</p>
                )}

                <button
                  type="submit"
                  disabled={confirmBusy}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {confirmBusy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t.chat.confirmButton} — {formatFcfa(pending.totalFcfa)}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Suivi en temps réel de la commande confirmée */}
        {confirmed && (
          <div className="animate-oren-rise overflow-hidden rounded-3xl border border-primary/40 bg-card p-5 shadow-xl shadow-primary/10 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-heading text-sm">{t.chat.confirmedTitle}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                #{confirmed.orderId.slice(0, 8)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">{t.chat.confirmedBody}</p>

            {/* Frise d'étapes de suivi */}
            <div className="space-y-1.5 py-1">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>{t.orderSteps.received}</span>
                <span>{t.orderSteps.preparing}</span>
                <span>{t.orderSteps.ready}</span>
                <span>{t.orderSteps.delivered}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(15, (stepIndex + 1) * 20))}%` }}
                />
              </div>
            </div>

            {/* Reçu détaillé */}
            {confirmed.lines.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 text-xs">
                <p className="font-bold text-foreground mb-1.5">Votre reçu :</p>
                <ul className="space-y-1 text-muted-foreground">
                  {confirmed.lines.map((line, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{line.quantity} × {line.name}</span>
                      <span className="font-semibold">{formatFcfa(line.priceFcfa * line.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex justify-between border-t border-border/60 pt-2 font-bold text-sm text-primary">
                  <span>{t.chat.totalLabel}</span>
                  <span>{formatFcfa(confirmed.totalFcfa)}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border/80 bg-background text-xs font-bold text-foreground shadow-xs hover:bg-secondary active:scale-95 transition-all"
              onClick={orderAgain}
            >
              {t.chat.orderAgain}
            </button>
          </div>
        )}

        {error && !sending && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive text-center">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Panier Flottant avec le total calculé par le code */}
      {cartCount > 0 && !showMenu && (
        <div className="shrink-0 px-3 pb-1">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/50 bg-card/95 p-2.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-extrabold text-background">
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Panier ({cartCount} plat{cartCount > 1 ? "s" : ""})</p>
                <p className="text-xs font-bold text-primary">{formatFcfa(cartTotal)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setCart({})}
              >
                {t.chat.cartClear}
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all"
                onClick={orderFromCart}
                disabled={sending || handed || Boolean(confirmed)}
              >
                Commander
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feuille de Menu en overlay (quand on clique sur "Voir le menu") */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-border/80 bg-background p-4 shadow-2xl animate-oren-rise">
            <ChatMenu
              menuItems={menuItems}
              cart={cart}
              onChangeQty={changeCartQty}
              onClear={() => setCart({})}
              onOrder={orderFromCart}
              disableOrder={sending || handed || Boolean(confirmed)}
              onClose={() => setShowMenu(false)}
            />
          </div>
        </div>
      )}

      {/* Formulaire de saisie de message (toujours actif, même fermé) */}
      <div className="border-t border-border/60 bg-background/95 p-3 backdrop-blur-md shrink-0">
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.chat.placeholder}
            disabled={handed}
            aria-label={t.chat.placeholder}
            className="flex h-11 flex-1 rounded-full border border-border/80 bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            disabled={sending || handed || !draft.trim()}
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-muted-foreground">
          <span>{t.app.poweredBy}</span>
          <LogoMark className="h-3.5 w-3.5 text-[#0ebb7c]" />
          <span className="font-bold text-foreground">Oren</span>
        </p>
      </div>
    </div>
  );
}

function resolveAnonymousId(slug: string): string {
  if (typeof window === "undefined") return "server-session";
  const key = `oren-session-${slug}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `anon-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  try {
    window.localStorage.setItem(key, created);
  } catch {
    // quota
  }
  return created;
}
