"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fr } from "@/i18n/fr";
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
  const [notifState, setNotifState] = useState<"idle" | "on" | "blocked">("idle");
  const knownIds = useRef(new Set(initialOrders.map((o) => o.id)));

  // Temps réel : toute commande de l'entreprise, dès qu'elle change en base.
  useEffect(() => {
    const supabase = createClient();
    // Realtime applique la RLS avec le jeton de session : sans setAuth
    // explicite, le client cookie (SSR) ne reçoit aucun événement.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void supabase.realtime.setAuth(data.session.access_token);
      }
    });
    const channel = supabase
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
          if (isArrival && !knownIds.current.has(next.id)) {
            playNewOrderSound();
          }
          knownIds.current.add(next.id);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{fr.orders.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.orders.boardHelp}</p>
        </div>
        {notifState === "on" ? (
          <Badge variant="secondary">{fr.orders.notificationsOn}</Badge>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={enableNotifications}>
            {fr.orders.enableNotifications}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {fr.orders.empty}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
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
                          {fr.orders.total} : {order.total_fcfa} {fr.common.currency}
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
                          <p className="text-xs text-muted-foreground">
                            {fr.orders.waitingFor} {formatDelay(waitingMs)}
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
    </div>
  );
}
