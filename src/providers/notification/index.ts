/**
 * NotificationProvider — alertes du patron (AGENTS.md).
 *
 * Trois canaux derrière la même interface :
 * - realtime : l'événement existe déjà dans l'espace patron via
 *   Supabase Realtime (la commande insérée/mise à jour est l'événement).
 *   L'implémentation RealtimeNotificationProvider confirme la prise en
 *   charge ; l'affichage immédiat et le son sont côté tableau patron.
 * - browser : vraie notification Web Push (service worker + VAPID),
 *   via WebPushNotificationProvider et les abonnements stockés dans
 *   push_subscriptions.
 * - email : e-mail de secours (Resend si RESEND_API_KEY est défini,
 *   sinon fournisseur factice qui n'envoie rien et le dit).
 */

export type NotificationChannel = "realtime" | "browser" | "email";

export interface NotificationMessage {
  businessId: string;
  title: string;
  body: string;
  channel?: NotificationChannel;
  /** Destinataire e-mail (canal email uniquement). */
  email?: string;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  delivered: boolean;
  channel: NotificationChannel;
  detail?: string;
}

export interface NotificationProvider {
  readonly name: string;
  notify(message: NotificationMessage): Promise<NotificationResult>;
}

/** Version factice : journalise en mémoire, ne contacte aucun service. */
export class FakeNotificationProvider implements NotificationProvider {
  readonly name = "fake";
  readonly sent: NotificationMessage[] = [];

  async notify(message: NotificationMessage): Promise<NotificationResult> {
    this.sent.push(message);
    return { delivered: true, channel: message.channel ?? "realtime" };
  }
}

/** Version console, utile en développement local. */
export class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async notify(message: NotificationMessage): Promise<NotificationResult> {
    console.info(`[notification:${message.businessId}] ${message.title} — ${message.body}`);
    return { delivered: true, channel: message.channel ?? "realtime" };
  }
}

/**
 * Canal temps réel : l'alerte « existe » dès que la commande est en
 * base ; le tableau patron l'affiche immédiatement (Supabase Realtime)
 * et joue le son. Ce fournisseur marque la prise en charge sans autre
 * appel réseau.
 */
export class RealtimeNotificationProvider implements NotificationProvider {
  readonly name = "supabase-realtime";

  async notify(message: NotificationMessage): Promise<NotificationResult> {
    void message;
    return { delivered: true, channel: "realtime", detail: "evenement_realtime" };
  }
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSender = (
  subscription: PushSubscriptionRecord,
  payload: string,
) => Promise<void>;

/**
 * Web Push réel (protocole push des navigateurs, clés VAPID).
 * L'envoi est injectable pour les tests ; par défaut, le paquet
 * web-push est chargé à la demande avec les clés d'environnement
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.
 */
export class WebPushNotificationProvider implements NotificationProvider {
  readonly name = "web-push";

  constructor(
    private readonly loadSubscriptions: (
      businessId: string,
    ) => Promise<PushSubscriptionRecord[]>,
    private readonly sendPush?: PushSender,
    private readonly onSubscriptionGone?: (endpoint: string) => Promise<void>,
  ) {}

  async notify(message: NotificationMessage): Promise<NotificationResult> {
    const subscriptions = await this.loadSubscriptions(message.businessId);
    if (subscriptions.length === 0) {
      return { delivered: false, channel: "browser", detail: "aucun_abonnement" };
    }
    const sender = this.sendPush ?? (await defaultPushSender());
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    });
    let delivered = 0;
    for (const subscription of subscriptions) {
      try {
        await sender(subscription, payload);
        delivered += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.onSubscriptionGone?.(subscription.endpoint);
        }
      }
    }
    return {
      delivered: delivered > 0,
      channel: "browser",
      detail: `${delivered}/${subscriptions.length}`,
    };
  }
}

async function defaultPushSender(): Promise<PushSender> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@oren.tg";
  if (!publicKey || !privateKey) {
    throw new Error("Clés VAPID absentes (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return async (subscription, payload) => {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
    );
  };
}

export type EmailSender = (input: {
  to: string;
  subject: string;
  text: string;
}) => Promise<void>;

/** E-mail de secours via Resend (fetch), expéditeur injectable pour les tests. */
export class ResendEmailNotificationProvider implements NotificationProvider {
  readonly name = "resend-email";

  constructor(private readonly sendEmail?: EmailSender) {}

  async notify(message: NotificationMessage): Promise<NotificationResult> {
    if (!message.email) {
      return { delivered: false, channel: "email", detail: "aucun_destinataire" };
    }
    const sender = this.sendEmail ?? defaultEmailSender;
    try {
      await sender({ to: message.email, subject: message.title, text: message.body });
      return { delivered: true, channel: "email" };
    } catch (error) {
      return {
        delivered: false,
        channel: "email",
        detail: error instanceof Error ? error.message : "envoi_echoue",
      };
    }
  }
}

async function defaultEmailSender(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("E-mail non configuré (RESEND_API_KEY / EMAIL_FROM).");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
}
