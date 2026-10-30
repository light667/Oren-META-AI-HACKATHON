import { createHash, randomBytes } from "node:crypto";
import { fr } from "@/i18n/fr";
import { isExplicitAgreement } from "@/core/agreement";
import type { AssistantStore, BusinessRecord, OrderLineRecord } from "@/core/store";
import { ToolRefusal } from "@/core/tool-registry";

/**
 * Commandes : le code décide, le modèle propose (AGENTS.md règle 1).
 * Les prix viennent toujours de la base, jamais des arguments du
 * modèle ni du texte du client. Un argument « prix » éventuel est
 * ignoré par le schéma Zod de l'outil (clés inconnues écartées).
 */

export interface PricedOrder {
  lines: OrderLineRecord[];
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalFcfa: number;
  summaryText: string;
  summaryHash: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function canonicalSummary(lines: OrderLineRecord[], fee: number, total: number): string {
  const sorted = [...lines]
    .map((l) => ({
      menuItemId: l.menuItemId,
      itemName: l.itemName,
      unitPriceFcfa: l.unitPriceFcfa,
      quantity: l.quantity,
      lineTotalFcfa: l.lineTotalFcfa,
    }))
    .sort((a, b) => String(a.menuItemId).localeCompare(String(b.menuItemId)));
  return JSON.stringify({ lines: sorted, deliveryFeeFcfa: fee, totalFcfa: total });
}

const MAX_LINES = 50;
const MAX_QUANTITY_PER_ITEM = 99;

export function computeSummaryHash(
  lines: OrderLineRecord[],
  fee: number,
  total: number,
): string {
  return createHash("sha256").update(canonicalSummary(lines, fee, total)).digest("hex");
}

export async function priceOrder(
  store: AssistantStore,
  business: BusinessRecord,
  items: { menuItemId: string; quantity: number }[],
  deliveryZoneName?: string | null,
): Promise<PricedOrder> {
  if (items.length === 0) {
    throw new ToolRefusal(fr.assistant.errors.invalidQuantity);
  }
  // Fusion des doublons avant tout plafond : deux lignes de 60 pour le
  // même plat valent 120, pas deux fois « moins de 99 ».
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ToolRefusal(fr.assistant.errors.invalidQuantity);
    }
    merged.set(item.menuItemId, (merged.get(item.menuItemId) ?? 0) + item.quantity);
  }
  if (merged.size > MAX_LINES) {
    throw new ToolRefusal(fr.assistant.errors.invalidQuantity);
  }
  for (const quantity of merged.values()) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new ToolRefusal(fr.assistant.errors.invalidQuantity);
    }
  }
  const lines: OrderLineRecord[] = [];
  let subtotal = 0;
  for (const [menuItemId, quantity] of merged) {
    const item = { menuItemId, quantity };
    const menuItem = await store.getMenuItem(business.id, item.menuItemId);
    if (!menuItem) throw new ToolRefusal(fr.assistant.errors.itemNotFound);
    if (!menuItem.available) throw new ToolRefusal(fr.assistant.errors.itemUnavailable);
    const lineTotal = menuItem.priceFcfa * item.quantity;
    subtotal += lineTotal;
    lines.push({
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      unitPriceFcfa: menuItem.priceFcfa,
      quantity: item.quantity,
      lineTotalFcfa: lineTotal,
    });
  }

  let fee = 0;
  if (deliveryZoneName?.trim()) {
    const zones = await store.listDeliveryZones(business.id);
    const zone = zones.find(
      (z) =>
        z.isActive &&
        z.neighborhood.toLowerCase() === deliveryZoneName.trim().toLowerCase(),
    );
    if (!zone) throw new ToolRefusal(fr.assistant.errors.zoneNotFound);
    fee = zone.feeFcfa;
  }

  const total = subtotal + fee;
  const linesText = lines
    .map((l) => `- ${l.quantity} × ${l.itemName} : ${l.lineTotalFcfa} ${fr.common.currency}`)
    .join("\n");
  const summaryText = [
    fr.assistant.orderSummaryTitle,
    linesText,
    `${fr.assistant.orderSummarySubtotal} : ${subtotal} ${fr.common.currency}`,
    `${fr.assistant.orderSummaryDelivery} : ${fee} ${fr.common.currency}`,
    `${fr.assistant.orderSummaryTotal} : ${total} ${fr.common.currency}`,
    fr.assistant.orderSummaryAsk,
  ].join("\n");

  return {
    lines,
    subtotalFcfa: subtotal,
    deliveryFeeFcfa: fee,
    totalFcfa: total,
    summaryText,
    summaryHash: computeSummaryHash(lines, fee, total),
  };
}

export async function prepareOrder(
  store: AssistantStore,
  business: BusinessRecord,
  input: {
    items: { menuItemId: string; quantity: number }[];
    deliveryZone?: string | null;
    sessionId: string;
    conversationId: string;
    customerId: string | null;
  },
): Promise<Record<string, unknown>> {
  const priced = await priceOrder(store, business, input.items, input.deliveryZone);
  const order = await store.createPendingOrder({
    businessId: business.id,
    customerId: input.customerId,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    lines: priced.lines,
    deliveryFeeFcfa: priced.deliveryFeeFcfa,
    totalFcfa: priced.totalFcfa,
    paymentMethod: "cash_on_delivery",
  });

  // Jeton à usage unique, lié à ce récapitulatif exact (hachage du résumé).
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await store.createConfirmationToken({
    businessId: business.id,
    orderId: order.id,
    tokenHash: hashToken(token),
    summaryHash: priced.summaryHash,
    expiresAt,
  });

  return {
    ok: true,
    orderId: order.id,
    status: order.status,
    subtotalFcfa: priced.subtotalFcfa,
    deliveryFeeFcfa: priced.deliveryFeeFcfa,
    totalFcfa: priced.totalFcfa,
    summary: priced.summaryText,
    confirmationToken: token,
    expiresAt,
  };
}

/**
 * Confirmation (règle 2) : jeton valide, non utilisé, non expiré,
 * récapitulatif inchangé, et dernier message du client = accord
 * explicite. Chaque échec est un refus net, sans écriture.
 */
export async function confirmOrder(
  store: AssistantStore,
  business: BusinessRecord,
  input: { token?: string | null; conversationId: string; sessionId: string },
): Promise<Record<string, unknown>> {
  let tokenHash: string | null = null;
  if (input.token?.trim()) {
    tokenHash = hashToken(input.token.trim());
  }
  const token = tokenHash ? await store.getConfirmationTokenByHash(tokenHash) : null;
  if (!token || token.businessId !== business.id) {
    throw new ToolRefusal(fr.assistant.errors.tokenInvalid);
  }
  if (token.usedAt) throw new ToolRefusal(fr.assistant.errors.tokenUsed);
  if (new Date(token.expiresAt).getTime() < Date.now()) {
    throw new ToolRefusal(fr.assistant.errors.tokenExpired);
  }

  const order = await store.getOrder(business.id, token.orderId);
  if (!order) throw new ToolRefusal(fr.assistant.errors.tokenInvalid);

  // Le jeton n'est valable que dans la session et la conversation qui
  // ont préparé la commande : un jeton volé ailleurs ne confirme rien.
  if (order.sessionId !== input.sessionId || order.conversationId !== input.conversationId) {
    throw new ToolRefusal(fr.assistant.errors.tokenInvalid);
  }

  const lastCustomer = await store.getLastCustomerMessage(input.conversationId);
  if (!lastCustomer || !isExplicitAgreement(lastCustomer.content)) {
    throw new ToolRefusal(fr.assistant.errors.noAgreement);
  }
  // L'accord doit suivre l'émission du jeton : un « oui » donné avant
  // d'avoir vu le récapitulatif ne confirme pas ce récapitulatif.
  // new Date(...) accepte une chaîne ISO comme un objet Date (PGlite).
  const agreementAt = new Date(lastCustomer.createdAt).getTime();
  const tokenAt = new Date(token.createdAt).getTime();
  if (!Number.isFinite(agreementAt) || !Number.isFinite(tokenAt) || agreementAt <= tokenAt) {
    throw new ToolRefusal(fr.assistant.errors.noAgreement);
  }

  if (order.status !== "pending") {
    throw new ToolRefusal(fr.assistant.errors.orderNotPending);
  }

  // Le récapitulatif confirmé doit être exactement celui qui a été chiffré.
  const recomputed = computeSummaryHash(order.lines, order.deliveryFeeFcfa, order.totalFcfa);
  const linesTotal = order.lines.reduce((sum, l) => sum + l.lineTotalFcfa, 0);
  if (
    recomputed !== token.summaryHash ||
    linesTotal + order.deliveryFeeFcfa !== order.totalFcfa
  ) {
    throw new ToolRefusal(fr.assistant.errors.summaryMismatch);
  }

  // Consommation atomique : sur deux confirmations simultanées, une
  // seule passe. Si la mise à jour du statut échoue ensuite, le jeton
  // reste consommé et la commande en attente (échec sûr, pas de doublon).
  const consumed = await store.consumeConfirmationToken(token.id);
  if (!consumed) throw new ToolRefusal(fr.assistant.errors.tokenUsed);
  await store.updateOrderStatus(business.id, order.id, "confirmed");
  return { ok: true, orderId: order.id, status: "confirmed", totalFcfa: order.totalFcfa };
}
