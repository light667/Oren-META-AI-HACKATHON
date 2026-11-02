import { describe, expect, it } from "vitest";
import { fr } from "@/i18n/fr";
import {
  chatRateLimitsFromEnv,
  createChatRateLimiter,
  rateLimitMessage,
} from "./rate-limit";

const LIMITS = { perMinuteSession: 3, perMinuteIp: 5, perDayBusiness: 4 };

function at(second: number): number {
  return Date.UTC(2026, 9, 30, 12, 0, second);
}

describe("limiteur des routes publiques de chat", () => {
  it("laisse passer sous les limites, bloque la session au-delà par minute", () => {
    const limiter = createChatRateLimiter(LIMITS);
    const key = { businessId: "b1", sessionId: "s1", ip: "1.2.3.4" };
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.check(key, at(i)).allowed).toBe(true);
    }
    const blocked = limiter.check(key, at(3));
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("session");
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // Une autre session de la même IP passe encore (limite IP = 5).
    expect(
      limiter.check({ businessId: "b1", sessionId: "s2", ip: "1.2.3.4" }, at(4)).allowed,
    ).toBe(true);
  });

  it("bloque l'adresse IP au-delà de sa limite par minute", () => {
    const limiter = createChatRateLimiter(LIMITS);
    // Entreprise différente à chaque fois : seule la limite IP peut bloquer.
    for (let i = 0; i < 5; i += 1) {
      expect(
        limiter.check({ businessId: `b-ip-${i}`, sessionId: `s${i}`, ip: "9.9.9.9" }, at(i))
          .allowed,
      ).toBe(true);
    }
    const blocked = limiter.check(
      { businessId: "b-ip-autre", sessionId: "s-autre", ip: "9.9.9.9" },
      at(6),
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("ip");
  });

  it("bloque l'entreprise au plafond quotidien, toutes sessions confondues", () => {
    const limiter = createChatRateLimiter(LIMITS);
    let last;
    for (let i = 0; i < 4; i += 1) {
      last = limiter.check(
        { businessId: "b-day", sessionId: `s${i}`, ip: `10.0.0.${i}` },
        at(i * 61),
      );
      expect(last.allowed).toBe(true);
    }
    const blocked = limiter.check(
      { businessId: "b-day", sessionId: "s-new", ip: "10.9.9.9" },
      at(4 * 61),
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("business_daily");
    // Une autre entreprise n'est pas affectée.
    expect(
      limiter.check({ businessId: "b-other", sessionId: "s1", ip: "10.9.9.9" }, at(4 * 61))
        .allowed,
    ).toBe(true);
  });

  it("la fenêtre d'une minute glisse : on repasse après expiration", () => {
    const limiter = createChatRateLimiter(LIMITS);
    const key = { businessId: "b1", sessionId: "s1", ip: "1.1.1.1" };
    for (let i = 0; i < 3; i += 1) limiter.check(key, at(i));
    expect(limiter.check(key, at(10)).allowed).toBe(false);
    expect(limiter.check(key, at(61)).allowed).toBe(true);
  });

  it("les limites viennent des variables d'environnement, avec des replis sûrs", () => {
    expect(
      chatRateLimitsFromEnv({
        CHAT_RATE_LIMIT_PER_MINUTE_SESSION: "7",
        CHAT_RATE_LIMIT_PER_MINUTE_IP: "42",
        CHAT_DAILY_LIMIT_PER_BUSINESS: "900",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({ perMinuteSession: 7, perMinuteIp: 42, perDayBusiness: 900 });
    const fallback = chatRateLimitsFromEnv({
      CHAT_RATE_LIMIT_PER_MINUTE_SESSION: "abc",
      CHAT_RATE_LIMIT_PER_MINUTE_IP: "-3",
      CHAT_DAILY_LIMIT_PER_BUSINESS: "0",
    } as unknown as NodeJS.ProcessEnv);
    expect(fallback.perMinuteSession).toBeGreaterThan(0);
    expect(fallback.perMinuteIp).toBeGreaterThan(0);
    expect(fallback.perDayBusiness).toBeGreaterThan(0);
  });

  it("le message de refus est en français et explique l'attente", () => {
    for (const reason of ["session", "ip", "business_daily"] as const) {
      const message = rateLimitMessage(reason, fr.chat);
      expect(message.length).toBeGreaterThan(20);
      expect(message).not.toMatch(/rate limit|too many/i);
    }
  });
});
