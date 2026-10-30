/**
 * Machine à états des commandes — le code décide (AGENTS.md règle 1).
 *
 * pending    brouillon chiffré, en attente de confirmation du client
 * confirmed  reçue (le client a confirmé, le restaurant est alerté)
 * accepted   acceptée par le patron  -> accepted_at enregistré
 * preparing  en préparation
 * ready      prête
 * delivered  livrée (terminal)
 * cancelled  annulée (terminal)
 *
 * Toute transition hors de cette table est refusée, côté interface
 * comme côté serveur.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "accepted",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Transitions actionnables par le patron (le passage à confirmed est réservé au client). */
const OWNER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  confirmed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string, to: string): boolean {
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export function ownerNextStatuses(from: string): OrderStatus[] {
  if (!isOrderStatus(from)) return [];
  return OWNER_TRANSITIONS[from];
}

/** Délai d'acceptation en millisecondes, null si pas encore acceptée. */
export function acceptanceDelayMs(order: {
  receivedAt?: string | Date | null;
  createdAt?: string | Date | null;
  acceptedAt?: string | Date | null;
}): number | null {
  if (!order.acceptedAt) return null;
  const start = order.receivedAt ?? order.createdAt;
  if (!start) return null;
  const delay =
    new Date(order.acceptedAt as string).getTime() - new Date(start as string).getTime();
  return Number.isFinite(delay) && delay >= 0 ? delay : null;
}

/** Une commande reçue non acceptée après le délai doit déclencher l'e-mail de secours. */
export function needsFallbackEmail(
  order: {
    status: string;
    receivedAt?: string | Date | null;
    createdAt?: string | Date | null;
    fallbackEmailSentAt?: string | Date | null;
  },
  now: Date,
  delayMs: number,
): boolean {
  if (order.status !== "confirmed") return false;
  if (order.fallbackEmailSentAt) return false;
  const start = order.receivedAt ?? order.createdAt;
  if (!start) return false;
  return now.getTime() - new Date(start as string).getTime() >= delayMs;
}
