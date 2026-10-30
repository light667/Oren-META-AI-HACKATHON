import { describe, expect, it } from "vitest";
import {
  acceptanceDelayMs,
  canTransition,
  needsFallbackEmail,
  ownerNextStatuses,
} from "./order-transitions";

describe("machine à états des commandes", () => {
  it("autorise le parcours complet reçue -> acceptée -> préparation -> prête -> livrée", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "accepted")).toBe(true);
    expect(canTransition("accepted", "preparing")).toBe(true);
    expect(canTransition("preparing", "ready")).toBe(true);
    expect(canTransition("ready", "delivered")).toBe(true);
  });

  it("refuse les transitions interdites", () => {
    for (const [from, to] of [
      ["pending", "preparing"],
      ["pending", "delivered"],
      ["confirmed", "ready"],
      ["confirmed", "delivered"],
      ["accepted", "delivered"],
      ["ready", "cancelled"],
      ["delivered", "preparing"],
      ["cancelled", "confirmed"],
      ["confirmed", "pending"],
      ["accepted", "confirmed"],
    ]) {
      expect(canTransition(from, to), `${from} -> ${to}`).toBe(false);
    }
  });

  it("le patron ne peut pas marquer « reçue » lui-même (réservé au client)", () => {
    expect(ownerNextStatuses("pending")).toEqual(["cancelled"]);
    expect(ownerNextStatuses("confirmed")).toEqual(["accepted", "cancelled"]);
    expect(ownerNextStatuses("delivered")).toEqual([]);
  });

  it("enregistre le délai d'acceptation", () => {
    const received = new Date("2026-10-30T12:00:00Z");
    const accepted = new Date("2026-10-30T12:02:30Z");
    expect(
      acceptanceDelayMs({ receivedAt: received, acceptedAt: accepted }),
    ).toBe(150_000);
    expect(acceptanceDelayMs({ receivedAt: received, acceptedAt: null })).toBeNull();
  });

  it("e-mail de secours seulement si reçue, non acceptée, délai dépassé, pas déjà envoyé", () => {
    const now = new Date("2026-10-30T12:10:00Z");
    const base = {
      status: "confirmed",
      receivedAt: new Date("2026-10-30T12:00:00Z"),
      fallbackEmailSentAt: null,
    };
    expect(needsFallbackEmail(base, now, 3 * 60_000)).toBe(true);
    expect(needsFallbackEmail(base, new Date("2026-10-30T12:02:00Z"), 3 * 60_000)).toBe(false);
    expect(needsFallbackEmail({ ...base, status: "accepted" }, now, 3 * 60_000)).toBe(false);
    expect(
      needsFallbackEmail({ ...base, fallbackEmailSentAt: new Date() }, now, 3 * 60_000),
    ).toBe(false);
    // Délai réglable : avec 15 minutes, à 12:10 ce n'est pas encore dû.
    expect(needsFallbackEmail(base, now, 15 * 60_000)).toBe(false);
  });
});
