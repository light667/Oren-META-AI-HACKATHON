import { describe, expect, it } from "vitest";
import { authErrorMessage, isRateLimitError } from "./auth-error";

const messages = { rateLimited: "RATE", generic: "GENERIC" };

describe("isRateLimitError", () => {
  it("détecte le 429 Supabase Auth (statut ou code)", () => {
    expect(isRateLimitError({ status: 429, message: "Too many requests" })).toBe(true);
    expect(isRateLimitError({ code: "over_email_send_rate_limit" })).toBe(true);
    expect(isRateLimitError({ code: "over_request_rate_limit" })).toBe(true);
  });

  it("ne confond pas avec un lien invalide ou une autre erreur", () => {
    expect(isRateLimitError({ status: 400, code: "otp_expired", message: "expired" })).toBe(false);
    expect(isRateLimitError(new Error("réseau coupé"))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError("429")).toBe(false);
  });
});

describe("authErrorMessage", () => {
  it("message d'attente si rate limit, générique sinon", () => {
    expect(authErrorMessage({ status: 429 }, messages)).toBe("RATE");
    expect(authErrorMessage(new Error("x"), messages)).toBe("GENERIC");
  });
});
