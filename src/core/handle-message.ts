/**
 * Cœur indépendant des canaux (AGENTS.md).
 * handleMessage ne connaît aucun canal : un canal est un adaptateur
 * qui convertit son format vers/depuis ces types. Seul l'adaptateur
 * web sera écrit pour le hackathon.
 * Implémentation complète : tâche suivante.
 */

export interface IncomingMessage {
  businessId: string;
  /** Session anonyme ou client identifié par téléphone (voir AGENTS.md). */
  sessionId: string;
  customerId?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface OutgoingMessage {
  text: string;
  /** Vrai si la main a été passée à un humain. */
  handedToHuman?: boolean;
}

export async function handleMessage(
  _message: IncomingMessage,
): Promise<OutgoingMessage> {
  void _message;
  throw new Error("handleMessage non implémenté (tâche suivante).");
}
