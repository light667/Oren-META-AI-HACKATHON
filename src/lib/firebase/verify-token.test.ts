import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyFirebaseIdToken } from "./verify-token";

const PROJECT = "oren-test";
let privateKey: CryptoKey;
let otherKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = (await exportJWK(pair.publicKey)) as JWK;
  keys = createLocalJWKSet({ keys: [{ ...jwk, kid: "k1", alg: "RS256" }] });
});

async function token(
  claims: Record<string, unknown> = {},
  opts: { key?: CryptoKey; iss?: string; aud?: string; exp?: string } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: "Patron@Exemple.TG",
    email_verified: true,
    auth_time: now - 10,
    firebase: { sign_in_provider: "password" },
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("uid-123")
    .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(opts.aud ?? PROJECT)
    .setIssuedAt(now - 10)
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? privateKey);
}

describe("verifyFirebaseIdToken", () => {
  it("accepte un jeton valide et normalise l'e-mail", async () => {
    const identity = await verifyFirebaseIdToken(await token(), { projectId: PROJECT, keys });
    expect(identity).toEqual({
      uid: "uid-123",
      email: "patron@exemple.tg",
      emailVerified: true,
      provider: "password",
    });
  });

  it("signale un e-mail non vérifié sans le refuser (la route décide)", async () => {
    const identity = await verifyFirebaseIdToken(await token({ email_verified: false }), {
      projectId: PROJECT,
      keys,
    });
    expect(identity.emailVerified).toBe(false);
  });

  it.each([
    ["signature d'une autre clé", { key: "other" }],
    ["autre projet (audience)", { aud: "autre-projet" }],
    ["autre émetteur", { iss: "https://securetoken.google.com/autre-projet" }],
    ["jeton expiré", { exp: "-1m" }],
  ])("refuse : %s", async (_label, opt) => {
    const t = await token(
      {},
      {
        key: (opt as { key?: string }).key ? otherKey : undefined,
        aud: (opt as { aud?: string }).aud,
        iss: (opt as { iss?: string }).iss,
        exp: (opt as { exp?: string }).exp,
      },
    );
    await expect(verifyFirebaseIdToken(t, { projectId: PROJECT, keys })).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("refuse un compte sans e-mail", async () => {
    await expect(
      verifyFirebaseIdToken(await token({ email: undefined }), { projectId: PROJECT, keys }),
    ).rejects.toMatchObject({ code: "no_email" });
  });

  it("refuse si Firebase n'est pas configuré", async () => {
    await expect(verifyFirebaseIdToken("x", { projectId: "", keys })).rejects.toMatchObject({
      code: "not_configured",
    });
  });
});
