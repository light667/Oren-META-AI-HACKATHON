import { z } from "zod";
import { confirmStructuredOrder } from "@/capabilities/catalog-orders/order-service";
import {
  createHandleMessage,
  type AssistantDeps,
  type AssistantReply,
  type PendingConfirmation,
} from "@/core/handle-message";
import { ToolRefusal } from "@/core/tool-registry";
import { fr } from "@/i18n/fr";
import { phoneSchema } from "@/lib/validation";

/**
 * Adaptateur web — seul canal écrit pour le hackathon.
 * Entrée : convertit le message web en appel du cœur
 * handleMessage(businessId, sessionId, channel, message), qui ne
 * connaît aucun canal. Sortie : met la réponse au format web, y
 * compris la carte de confirmation structurée. Telegram et WhatsApp
 * viendront ensuite sans toucher au cœur.
 */

export interface WebInbound {
  businessId: string;
  /** Identifiant anonyme gardé par le navigateur du client. */
  sessionId: string;
  text: string;
}

export interface WebOutbound {
  text: string;
  handedToHuman: boolean;
  conversationId: string | null;
  pendingConfirmation: PendingConfirmation | null;
}

export function webToCore(input: WebInbound): {
  businessId: string;
  sessionId: string;
  channel: "web";
  message: string;
} {
  return {
    businessId: input.businessId,
    sessionId: input.sessionId,
    channel: "web",
    message: input.text,
  };
}

export function coreToWeb(reply: AssistantReply): WebOutbound {
  return {
    text: reply.text,
    handedToHuman: reply.handedToHuman,
    conversationId: reply.conversationId,
    pendingConfirmation: reply.pendingConfirmation,
  };
}

/** Point d'entrée du canal web pour un message texte client. */
export async function handleWebMessage(
  deps: AssistantDeps,
  input: WebInbound,
): Promise<WebOutbound> {
  const core = webToCore(input);
  const handle = createHandleMessage(deps);
  const reply = await handle(core.businessId, core.sessionId, core.channel, core.message);
  return coreToWeb(reply);
}

export const webConfirmSchema = z.object({
  token: z.string().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: phoneSchema,
  paymentMethod: z.enum(["cash_on_delivery", "cash_on_pickup"]),
});

export type WebConfirmInput = z.infer<typeof webConfirmSchema>;

export type WebConfirmResult =
  | { ok: true; orderId: string; totalFcfa: number }
  | { ok: false; error: string };

/**
 * Confirmation structurée (chemin principal) : le bouton « Je confirme »
 * envoie le jeton du récapitulatif exact, le nom et le téléphone du
 * client (stockés dans customers, non vérifiés pour l'instant) et le
 * mode de paiement. Aucune interprétation de texte : le clic vaut
 * accord explicite, les autres garde-fous du jeton s'appliquent.
 */
export async function confirmWebOrder(
  deps: AssistantDeps,
  input: { businessId: string; sessionId: string } & WebConfirmInput,
): Promise<WebConfirmResult> {
  const { store } = deps;
  const business = await store.getBusiness(input.businessId);
  if (!business) return { ok: false, error: fr.chat.confirmError };

  const session = await store.getOrCreateSession(input.businessId, input.sessionId);
  const conversation = await store.getOpenConversation(session.id, "web");
  if (!conversation) return { ok: false, error: fr.chat.confirmError };

  try {
    const customer = await store.upsertCustomerByPhone(input.businessId, {
      name: input.customerName,
      phone: input.customerPhone,
    });
    await store.setSessionCustomer(session.id, customer.id);

    const result = await confirmStructuredOrder(store, business, {
      token: input.token,
      conversationId: conversation.id,
      sessionId: session.id,
    });
    const orderId = String(result.orderId);
    await store.updateOrderCustomerAndPayment(
      input.businessId,
      orderId,
      customer.id,
      input.paymentMethod,
    );
    await store.addMessage({
      businessId: input.businessId,
      conversationId: conversation.id,
      senderRole: "customer",
      content: `[confirmation structurée] ${input.customerName} — ${input.paymentMethod}`,
    });
    await store.logAudit({
      businessId: input.businessId,
      actorType: "customer",
      actorId: input.sessionId,
      toolName: "confirm_order",
      action: "structured_confirm",
      input: { paymentMethod: input.paymentMethod },
      output: { ok: true, orderId },
    });
    return { ok: true, orderId, totalFcfa: Number(result.totalFcfa ?? 0) };
  } catch (error) {
    await store.logAudit({
      businessId: input.businessId,
      actorType: "customer",
      actorId: input.sessionId,
      toolName: "confirm_order",
      action: "structured_confirm_refused",
      input: { paymentMethod: input.paymentMethod },
      output: {
        ok: false,
        error: error instanceof ToolRefusal ? error.reason : "confirm_failed",
      },
    });
    return { ok: false, error: fr.chat.confirmError };
  }
}

/** Bouton « Parler à un humain » : action structurée, sans modèle. */
export async function requestWebHuman(
  deps: AssistantDeps,
  input: { businessId: string; sessionId: string },
): Promise<{ ok: true }> {
  const { store } = deps;
  const session = await store.getOrCreateSession(input.businessId, input.sessionId);
  let conversation = await store.getOpenConversation(session.id, "web");
  if (!conversation) {
    conversation = await store.createConversation({
      businessId: input.businessId,
      sessionId: session.id,
      customerId: session.customerId,
      channel: "web",
    });
  }
  await store.updateConversation(conversation.id, {
    status: "a_reprendre",
    assistantPaused: true,
  });
  await store.addMessage({
    businessId: input.businessId,
    conversationId: conversation.id,
    senderRole: "system",
    content: fr.chat.humanSummary,
  });
  await store.logAudit({
    businessId: input.businessId,
    actorType: "customer",
    actorId: input.sessionId,
    toolName: "handoff_to_human",
    action: "structured_handoff",
    input: {},
    output: { ok: true, handedToHuman: true },
  });
  return { ok: true };
}
