import { describe, expect, it, vi } from "vitest";
import { alertDelayMs } from "@/lib/order-notifications";
import {
  FakeNotificationProvider,
  RealtimeNotificationProvider,
  ResendEmailNotificationProvider,
  WebPushNotificationProvider,
} from "./index";

describe("NotificationProvider — canaux", () => {
  it("realtime confirme la prise en charge sans appel réseau", async () => {
    const result = await new RealtimeNotificationProvider().notify({
      businessId: "b1",
      title: "Nouvelle commande",
      body: "5000 FCFA",
    });
    expect(result).toMatchObject({ delivered: true, channel: "realtime" });
  });

  it("web push envoie à chaque abonnement et signale les abonnements morts", async () => {
    const sent: string[] = [];
    const gone: string[] = [];
    const provider = new WebPushNotificationProvider(
      async () => [
        { endpoint: "https://push.example/ok", p256dh: "k1", auth: "a1" },
        { endpoint: "https://push.example/mort", p256dh: "k2", auth: "a2" },
      ],
      async (sub) => {
        if (sub.endpoint.endsWith("mort")) {
          throw Object.assign(new Error("gone"), { statusCode: 410 });
        }
        sent.push(sub.endpoint);
      },
      async (endpoint) => {
        gone.push(endpoint);
      },
    );
    const result = await provider.notify({
      businessId: "b1",
      title: "Nouvelle commande",
      body: "5000 FCFA",
    });
    expect(result.delivered).toBe(true);
    expect(sent).toEqual(["https://push.example/ok"]);
    expect(gone).toEqual(["https://push.example/mort"]);
  });

  it("web push sans abonnement : non livré, sans erreur", async () => {
    const provider = new WebPushNotificationProvider(async () => []);
    const result = await provider.notify({ businessId: "b1", title: "t", body: "b" });
    expect(result.delivered).toBe(false);
  });

  it("e-mail de secours : envoie au destinataire, refuse sans destinataire", async () => {
    const send = vi.fn(async () => {});
    const provider = new ResendEmailNotificationProvider(send);
    const ok = await provider.notify({
      businessId: "b1",
      title: "Commande en attente",
      body: "…",
      email: "patron@exemple.tg",
      channel: "email",
    });
    expect(ok.delivered).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    const ko = await provider.notify({ businessId: "b1", title: "t", body: "b" });
    expect(ko.delivered).toBe(false);
  });

  it("le factice journalise sans rien envoyer", async () => {
    const fake = new FakeNotificationProvider();
    await fake.notify({ businessId: "b1", title: "t", body: "b" });
    expect(fake.sent).toHaveLength(1);
  });
});

describe("délai d'alerte réglable", () => {
  it("défaut 3 minutes, réglage par entreprise prioritaire", () => {
    expect(alertDelayMs({})).toBe(3 * 60_000);
    expect(alertDelayMs({ alert_delay_minutes: 10 })).toBe(10 * 60_000);
    expect(alertDelayMs({ alert_delay_minutes: "abc" })).toBe(3 * 60_000);
  });
});
