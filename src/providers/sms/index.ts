/**
 * SmsProvider — interface seulement, non implémentée (AGENTS.md).
 * La vérification du numéro de téléphone par SMS viendra après le
 * hackathon. Aucun envoi réel ne doit passer par la version factice.
 */

export interface SmsMessage {
  to: string; // numéro au format international, ex. +228 XX XX XX XX
  body: string;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<{ sent: boolean; detail: string }>;
}

/** Version factice : n'envoie rien, le dit explicitement. */
export class FakeSmsProvider implements SmsProvider {
  readonly name = "fake";
  readonly attempted: SmsMessage[] = [];

  async send(message: SmsMessage) {
    this.attempted.push(message);
    return { sent: false, detail: "SMS non implémenté : aucun message envoyé." };
  }
}

/** Garde-fou : lever une erreur plutôt que de simuler un envoi en production. */
export class NotImplementedSmsProvider implements SmsProvider {
  readonly name = "not-implemented";

  async send(_message: SmsMessage): Promise<{ sent: boolean; detail: string }> {
    void _message;
    throw new Error("SmsProvider non implémenté.");
  }
}
