"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fr } from "@/i18n/fr";
import { formatFcfa } from "@/lib/format";
import { acceptanceDelayMs, ownerNextStatuses, type OrderStatus } from "@/lib/order-transitions";
import { createClient } from "@/lib/supabase/client";

export interface OrderRow {
  id: string;
  status: string;
  total_fcfa: number;
  payment_method: string;
  created_at: string;
  received_at: string | null;
  accepted_at: string | null;
}

function formatDelay(ms: number | null): string | null {
  if (ms === null) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} ${fr.orders.secondsShort}`;
  return `${Math.round(seconds / 60)} ${fr.orders.minutesShort}`;
}

function playNewOrderSound() {
  try {
    const Ctx = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Son best-effort : l'affichage reste l'alerte principale.
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
}: {
  initialOrders: OrderRow[];
  businessId: string;
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const [notifState, setNotifState] = useState<"idle" | "on" | "blocked">("idle");
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const soundedIds = useRef(new Set<string>());

  // Temps réel : toute commande de l'entreprise, dès qu'elle change en base.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // Realtime applique la RLS au moment de l'abonnement : le jeton de
    // session doit être posé AVANT subscribe, sinon aucun événement.
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
            // Le brouillon (INSERT pending) ne doit pas « consommer »
            // l'arrivée : on ne sonne qu'à la confirmation, une fois.
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

  // Rafraîchit les compteurs « en attente depuis… » sans recharger.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const changeStatus = useCallback(async (order: OrderRow, status: OrderStatus) => {
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? fr.orders.transitionRefused);
      // Le temps réel confirmera ; on met aussi à jour tout de suite.
      setOrders((current) =>
        current.map((o) => (o.id === order.id ? { ...o, status } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.orders.transitionRefused);
    }
  }, []);

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
  }

  const columns: { id: keyof typeof fr.board.columns; statuses: string[] }[] = [
    { id: "nouvelles", statuses: ["pending", "confirmed"] },
    { id: "enPreparation", statuses: ["accepted", "preparing"] },
    { id: "pretes", statuses: ["ready"] },
    { id: "terminees", statuses: ["delivered", "cancelled"] },
  ];
  const newCount = orders.filter((o) => o.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {fr.orders.title}
            {newCount > 0 && (
              <Badge className="ml-2 align-middle">
                {newCount} {fr.board.newBadge}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.orders.boardHelp}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={toggleSound}
              aria-label={fr.board.soundOn}
            />
            <Label htmlFor="sound-toggle" className="text-sm">
              {soundEnabled ? fr.board.soundOn : fr.board.soundOff}
            </Label>
          </div>
          {notifState === "on" ? (
            <Badge variant="secondary">{fr.orders.notificationsOn}</Badge>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={enableNotifications}>
              {fr.orders.enableNotifications}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {fr.orders.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const columnOrders = orders.filter((o) => column.statuses.includes(o.status));
            return (
              <section key={column.id} aria-label={fr.board.columns[column.id]} className="space-y-3">
                <h2 className="flex items-center justify-between text-sm font-semibold">
                  {fr.board.columns[column.id]}
                  <Badge variant="secondary">{columnOrders.length}</Badge>
                </h2>
                {columnOrders.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    {fr.board.emptyColumn}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {columnOrders.map((order) => {
            const delay = formatDelay(
              acceptanceDelayMs({
                receivedAt: order.received_at,
                createdAt: order.created_at,
                acceptedAt: order.accepted_at,
              }),
            );
            const waitingMs =
              order.status === "confirmed"
                ? nowMs - new Date(order.received_at ?? order.created_at).getTime()
                : null;
            return (
              <li key={order.id}>
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {fr.orders.total} : {formatFcfa(order.total_fcfa)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fr.orders.payment[order.payment_method] ?? order.payment_method} ·{" "}
                          {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {delay && (
                          <p className="text-xs text-muted-foreground">
                            {fr.orders.acceptanceDelay} {delay}
                          </p>
                        )}
                        {waitingMs !== null && waitingMs > 0 && (
                          <p
                            className={`text-xs font-semibold ${
                              waitingMs < 5 * 60_000
                                ? "text-[var(--success)]"
                                : waitingMs < 15 * 60_000
                                  ? "text-[var(--warning)]"
                                  : "text-destructive"
                            }`}
                          >
                            {fr.board.waiting} {formatDelay(waitingMs)}
                          </p>
                        )}
                      </div>
                      <Badge variant={order.status === "confirmed" ? "default" : "secondary"}>
                        {fr.orders.status[order.status] ?? order.status}
                      </Badge>
                    </div>
                    {ownerNextStatuses(order.status).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ownerNextStatuses(order.status).map((next) => (
                          <Button
                            key={next}
                            type="button"
                            size="sm"
                            variant={next === "cancelled" ? "ghost" : "outline"}
                            onClick={() => changeStatus(order, next)}
                          >
                            {fr.orders.actions[next] ?? next}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
