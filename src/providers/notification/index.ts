/**
 * NotificationProvider — version simple pour le hackathon :
 * temps réel dans l'espace patron (à brancher sur Supabase Realtime),
 * notification navigateur et e-mail viendront par-dessus cette interface.
 * Telegram plus tard.
 */

export type NotificationChannel = "realtime" | "browser" | "email";

export interface NotificationMessage {
  businessId: string;
  title: string;
  body: string;
  channel?: NotificationChannel;
  data?: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly name: string;
  notify(message: NotificationMessage): Promise<{ delivered: boolean; channel: NotificationChannel }>;
}

/** Version factice : journalise en mémoire, ne contacte aucun service. */
export class FakeNotificationProvider implements NotificationProvider {
  readonly name = "fake";
  readonly sent: NotificationMessage[] = [];

  async notify(message: NotificationMessage) {
    this.sent.push(message);
    return { delivered: true, channel: message.channel ?? ("realtime" as const) };
  }
}

/** Version console, utile en développement local. */
export class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async notify(message: NotificationMessage) {
    console.info(`[notification:${message.businessId}] ${message.title} — ${message.body}`);
    return { delivered: true, channel: message.channel ?? ("realtime" as const) };
  }
}
