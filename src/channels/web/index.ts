import type { AssistantReply } from "@/core/handle-message";

/**
 * Adaptateur web — seul canal écrit pour le hackathon.
 * Entrée : convertit le message web en arguments du cœur
 * handleMessage(businessId, sessionId, channel, message), qui ne
 * connaît aucun canal. Sortie : met la réponse au format web.
 * Telegram et WhatsApp viendront ensuite sans toucher au cœur.
 */
export interface WebInbound {
  businessId: string;
  sessionId: string;
  text: string;
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

export function coreToWeb(reply: AssistantReply): {
  text: string;
  handedToHuman: boolean;
} {
  return { text: reply.text, handedToHuman: reply.handedToHuman };
}
