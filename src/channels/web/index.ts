import type { IncomingMessage, OutgoingMessage } from "@/core/handle-message";

/**
 * Adaptateur web — seul canal écrit pour le hackathon.
 * Entrée : convertit le message web au format commun du cœur.
 * Sortie : met la réponse du cœur au format web.
 * Telegram et WhatsApp viendront ensuite sans toucher au cœur.
 */
export interface WebInbound {
  businessId: string;
  sessionId: string;
  text: string;
}

export function webToCore(input: WebInbound): IncomingMessage {
  return { businessId: input.businessId, sessionId: input.sessionId, text: input.text };
}

export function coreToWeb(output: OutgoingMessage): { text: string; handedToHuman: boolean } {
  return { text: output.text, handedToHuman: output.handedToHuman ?? false };
}
