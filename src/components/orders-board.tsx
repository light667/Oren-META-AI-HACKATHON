"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/context";
import { formatFcfa } from "@/lib/format";
import { acceptanceDelayMs, ownerNextStatuses, type OrderStatus } from "@/lib/order-transitions";
import { createClient } from "@/lib/supabase/client";
import {
  Volume2,
  VolumeX,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  Check,
  ChefHat,
  PackageCheck,
  CheckCheck,
  XCircle,
  ExternalLink,
} from "lucide-react";

export interface OrderRow {
  id: string;
  status: string;
  total_fcfa: number;
  payment_method: string;
  created_at: string;
  received_at: string | null;
  accepted_at: string | null;
}

function formatDelay(ms: number | null, secondsText = "s", minutesText = "min"): string | null {
  if (ms === null) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} ${secondsText}`;
  return `${Math.round(seconds / 60)} ${minutesText}`;
}

function playNewOrderSound() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function OrdersBoard({
  initialOrders,
  businessId,
  slug,
}: {
  initialOrders: OrderRow[];
  businessId: string;
  slug?: string;
}) {
  const { t } = useI18n();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const [notifState, setNotifState] = useState<"idle" | "on" | "blocked">("idle");
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const soundedIds = useRef(new Set<string>());

  // Supabase Realtime subscription
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
        .channel(`orders-${businessId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${businessId}` },
          (payload) => {
            const next = payload.new as OrderRow;
            const prev = payload.old as Partial<OrderRow>;
            if (!next?.id) return;
            setOrders((current) => {
              const existing = current.find((o) => o.id === next.id);
              if (existing) {
                return current.map((o) => (o.id === next.id ? { ...existing, ...next } : o));
              }
              return [next, ...current];
            });
            const isArrival =
              (payload.eventType === "INSERT" && next.status === "confirmed") ||
              (payload.eventType === "UPDATE" && prev.status === "pending" && next.status === "confirmed");
            if (isArrival && soundEnabledRef.current && !soundedIds.current.has(next.id)) {
              soundedIds.current.add(next.id);
              playNewOrderSound();
            }
            knownIds.current.add(next.id);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const changeStatus = useCallback(
    async (order: OrderRow, status: OrderStatus) => {
      setError(null);
      try {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(data?.error ?? t.orders.transitionRefused);
        setOrders((current) =>
          current.map((o) => (o.id === order.id ? { ...o, status } : o)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t.orders.transitionRefused);
      }
    },
    [t],
  );

  async function enableNotifications() {
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotifState("blocked");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifState("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("subscription failed");
      setNotifState("on");
    } catch {
      setNotifState("blocked");
    }
  }

  function toggleSound(value: boolean) {
    setSoundEnabled(value);
    soundEnabledRef.current = value;
    if (value) playNewOrderSound();
  }

  const columns: { id: keyof typeof t.board.columns; statuses: string[] }[] = [
    { id: "nouvelles", statuses: ["pending", "confirmed"] },
    { id: "enPreparation", statuses: ["accepted", "preparing"] },
    { id: "pretes", statuses: ["ready"] },
    { id: "terminees", statuses: ["delivered", "cancelled"] },
  ];

  const newCount = orders.filter((o) => o.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* Barre supérieure du tableau */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t.orders.title}
            </h1>
            {newCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-xs animate-pulse">
                <span>{newCount}</span>
                <span>{t.board.newBadge}</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t.orders.boardHelp}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interrupteur Son */}
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-3 py-1.5">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-primary" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={toggleSound}
              aria-label={t.board.soundOn}
            />
            <Label htmlFor="sound-toggle" className="text-xs font-semibold cursor-pointer select-none">
              {soundEnabled ? "Son activé" : "Son coupé"}
            </Label>
          </div>

          {/* Notifications push */}
          {notifState === "on" ? (
            <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
              <Check className="mr-1 h-3 w-3" />
              {t.orders.notificationsOn}
            </Badge>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enableNotifications}
              className="h-9 rounded-xl border-border/80 text-xs font-semibold"
            >
              <Bell className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {t.orders.enableNotifications}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-12 text-center space-y-4">
          <p className="text-sm font-medium text-muted-foreground">{t.orders.empty}</p>
          {slug && (
            <div className="pt-2">
              <Link
                href={`/${slug}`}
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{t.ownerHome.viewPublic}</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const columnOrders = orders.filter((o) => column.statuses.includes(o.status));
            return (
              <section
                key={column.id}
                aria-label={t.board.columns[column.id]}
                className="flex flex-col space-y-3 rounded-3xl border border-border/60 bg-secondary/20 p-3.5 backdrop-blur-xs"
              >
                {/* En-tête de colonne */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {t.board.columns[column.id]}
                  </h2>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground">
                    {columnOrders.length}
                  </span>
                </div>

                {/* Liste des cartes */}
                {columnOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground/60">
                    {t.board.emptyColumn}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {columnOrders.map((order) => {
                      const delay = formatDelay(
                        acceptanceDelayMs({
                          receivedAt: order.received_at,
                          createdAt: order.created_at,
                          acceptedAt: order.accepted_at,
                        }),
                        t.orders.secondsShort,
                        t.orders.minutesShort,
                      );
                      const waitingMs =
                        order.status === "confirmed"
                          ? nowMs - new Date(order.received_at ?? order.created_at).getTime()
                          : null;

                      const isNew = order.status === "confirmed";

                      return (
                        <li key={order.id}>
                          <div
                            className={`rounded-2xl border bg-card p-4 shadow-xs transition-all hover:shadow-md ${
                              isNew
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-extrabold text-base text-primary">
                                  {formatFcfa(order.total_fcfa)}
                                </p>
                                <p className="text-xs text-muted-foreground pt-0.5">
                                  {t.orders.payment[order.payment_method] ?? order.payment_method}
                                </p>
                              </div>

                              <Badge
                                variant={isNew ? "default" : "secondary"}
                                className={
                                  isNew
                                    ? "bg-primary text-primary-foreground text-[10px] font-bold"
                                    : "text-[10px] text-muted-foreground"
                                }
                              >
                                {t.orders.status[order.status] ?? order.status}
                              </Badge>
                            </div>

                            {/* Horodatage & Délais */}
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              {delay && (
                                <span>
                                  • {t.orders.acceptanceDelay} {delay}
                                </span>
                              )}

                              {waitingMs !== null && waitingMs > 0 && (
                                <span
                                  className={`font-semibold ${
                                    waitingMs < 5 * 60_000
                                      ? "text-primary"
                                      : waitingMs < 15 * 60_000
                                        ? "text-amber-500"
                                        : "text-rose-500"
                                  }`}
                                >
                                  • {t.board.waiting} {formatDelay(waitingMs, t.orders.secondsShort, t.orders.minutesShort)}
                                </span>
                              )}
                            </div>

                            {/* Boutons d'action pour avancer le statut */}
                            {ownerNextStatuses(order.status).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-1">
                                {ownerNextStatuses(order.status).map((next) => {
                                  const isAccept = next === "accepted";
                                  const isCancel = next === "cancelled";
                                  return (
                                    <Button
                                      key={next}
                                      type="button"
                                      size="sm"
                                      className={`h-8 rounded-xl text-xs font-bold transition-all ${
                                        isAccept
                                          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-xs"
                                          : isCancel
                                            ? "text-destructive hover:bg-destructive/10"
                                            : "border-border/80 hover:bg-secondary"
                                      }`}
                                      variant={isAccept ? "default" : isCancel ? "ghost" : "outline"}
                                      onClick={() => changeStatus(order, next)}
                                    >
                                      {t.orders.actions[next] ?? next}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
