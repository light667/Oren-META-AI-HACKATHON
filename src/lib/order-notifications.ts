import type { SupabaseClient } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { needsFallbackEmail } from "@/lib/order-transitions";
import {
  RealtimeNotificationProvider,
  ResendEmailNotificationProvider,
  WebPushNotificationProvider,
  type NotificationProvider,
} from "@/providers/notification";

/**
 * Alertes patron à l'arrivée d'une commande (confirmed = « Reçue ») :
 * temps réel dans l'espace (Realtime), notification navigateur
 * (Web Push), puis e-mail de secours si la commande n'est pas
 * acceptée dans le délai réglable (défaut 3 minutes, réglable par
 * entreprise via config.alert_delay_minutes ou globalement via
 * ORDER_ALERT_DELAY_MINUTES).
 */

export function alertDelayMs(config: Record<string, unknown> | null | undefined): number {
  const perBusiness = config?.alert_delay_minutes;
  if (typeof perBusiness === "number" && perBusiness > 0) {
    return perBusiness * 60_000;
  }
  const envMinutes = Number(process.env.ORDER_ALERT_DELAY_MINUTES ?? "3");
  return (Number.isFinite(envMinutes) && envMinutes > 0 ? envMinutes : 3) * 60_000;
}

export interface OrderAlertDeps {
  realtime?: NotificationProvider;
  push?: NotificationProvider;
  email?: NotificationProvider;
}

function defaultDeps(admin: SupabaseClient): Required<OrderAlertDeps> {
  return {
    realtime: new RealtimeNotificationProvider(),
    push: new WebPushNotificationProvider(
      async (businessId) => {
        const { data } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("business_id", businessId);
        return (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
      },
      undefined,
      async (endpoint) => {
        await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
      },
    ),
    email: new ResendEmailNotificationProvider(),
  };
}

/** Alerte immédiate (temps réel + push) à la réception d'une commande. */
export async function notifyOrderReceived(
  admin: SupabaseClient,
  business: { id: string; name: string },
  order: { id: string; totalFcfa: number },
  deps: OrderAlertDeps = {},
): Promise<void> {
  const providers = { ...defaultDeps(admin), ...deps };
  const message = {
    businessId: business.id,
    title: fr.alerts.newOrderTitle,
    body: fr.alerts.newOrderBody
      .replace("{total}", String(order.totalFcfa))
      .replace("{business}", business.name),
    data: { orderId: order.id, url: "/app/commandes" },
  };
  await providers.realtime.notify({ ...message, channel: "realtime" });
  // Le push ne doit jamais faire échouer la confirmation du client.
  try {
    await providers.push.notify({ ...message, channel: "browser" });
  } catch {
    // Abonnements ou clés VAPID absents : le temps réel reste l'alerte.
  }
  await admin
    .from("orders")
    .update({ owner_notified_at: new Date().toISOString() })
    .eq("id", order.id);
}

/**
 * E-mail de secours : commandes reçues non acceptées après le délai.
 * Renvoie le nombre d'e-mails réellement envoyés (et marqués).
 */
export async function sendFallbackEmails(
  admin: SupabaseClient,
  now: Date = new Date(),
  deps: OrderAlertDeps = {},
): Promise<number> {
  const providers = { ...defaultDeps(admin), ...deps };
  const { data: orders } = await admin
    .from("orders")
    .select("id, business_id, status, total_fcfa, received_at, created_at, fallback_email_sent_at")
    .eq("status", "confirmed")
    .is("fallback_email_sent_at", null)
    .order("received_at", { ascending: true })
    .limit(50);
  if (!orders?.length) return 0;

  const businessIds = [...new Set(orders.map((o) => o.business_id as string))];
  const { data: businesses } = await admin
    .from("businesses")
    .select("id, name, config")
    .in("id", businessIds);
  const businessById = new Map(
    (businesses ?? []).map((b) => [b.id as string, b] as const),
  );

  let sent = 0;
  for (const order of orders) {
    const business = businessById.get(order.business_id as string);
    if (!business) continue;
    const delayMs = alertDelayMs(business.config as Record<string, unknown>);
    const due = needsFallbackEmail(
      {
        status: order.status as string,
        receivedAt: order.received_at as string | null,
        createdAt: order.created_at as string | null,
        fallbackEmailSentAt: order.fallback_email_sent_at as string | null,
      },
      now,
      delayMs,
    );
    if (!due) continue;

    const { data: owners } = await admin
      .from("staff")
      .select("user_id")
      .eq("business_id", business.id)
      .eq("role", "owner")
      .limit(1);
    const ownerId = owners?.[0]?.user_id as string | undefined;
    if (!ownerId) continue;
    const { data: userData } = await admin.auth.admin.getUserById(ownerId);
    const email = userData.user?.email;
    if (!email) continue;

    const minutes = Math.round(delayMs / 60_000);
    const result = await providers.email.notify({
      businessId: business.id as string,
      channel: "email",
      email,
      title: fr.alerts.fallbackSubject.replace("{business}", String(business.name)),
      body: fr.alerts.fallbackBody
        .replace("{total}", String(order.total_fcfa))
        .replace("{minutes}", String(minutes)),
      data: { orderId: order.id as string },
    });
    if (result.delivered) {
      await admin
        .from("orders")
        .update({ fallback_email_sent_at: now.toISOString() })
        .eq("id", order.id);
      sent += 1;
    }
  }
  return sent;
}
