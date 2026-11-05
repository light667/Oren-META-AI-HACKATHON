import { beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../../../next.config";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/onboarding", () => ({
  attachInvitedStaff: vi.fn(async () => null),
}));

/**
 * Régression : le lien e-mail doit créer la session puis router
 * (/app/commandes si membre, /bienvenue sinon), jamais l'accueil.
 * Test aussi que la config ne retombe pas en export statique,
 * incompatible avec cette route serveur (cookies + code OAuth).
 */

type FakeOptions = {
  exchangeError?: boolean;
  verifyError?: boolean;
  staff?: boolean;
};

function fakeSupabase({ exchangeError, verifyError, staff }: FakeOptions = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({
        error: exchangeError ? new Error("code invalide") : null,
      })),
      verifyOtp: vi.fn(async () => ({
        error: verifyError ? new Error("jeton invalide") : null,
      })),
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: staff ? { id: "staff-1" } : null,
          })),
        })),
      })),
    })),
  };
}

function location(response: Response): string {
  return response.headers.get("location") ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /auth/callback", () => {
  it("sans code ni jeton : retour connexion avec erreur, pas l'accueil", async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase() as never);
    const res = await GET(new Request("http://localhost:3000/auth/callback"));
    expect(location(res)).toBe("http://localhost:3000/connexion?erreur=lien");
  });

  it("erreur renvoyée par Supabase (?error=...) : retour connexion", async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase() as never);
    const res = await GET(
      new Request("http://localhost:3000/auth/callback?error=access_denied"),
    );
    expect(location(res)).toBe("http://localhost:3000/connexion?erreur=lien");
  });

  it("code valide, déjà membre : /app/commandes", async () => {
    const fake = fakeSupabase({ staff: true });
    vi.mocked(createClient).mockResolvedValue(fake as never);
    const res = await GET(
      new Request("http://localhost:3000/auth/callback?code=abc"),
    );
    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(res)).toBe("http://localhost:3000/app/commandes");
  });

  it("code valide, pas encore membre : /bienvenue", async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase() as never);
    const res = await GET(
      new Request("http://localhost:3000/auth/callback?code=abc"),
    );
    expect(location(res)).toBe("http://localhost:3000/bienvenue");
  });

  it("code refusé : retour connexion avec erreur", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ exchangeError: true }) as never,
    );
    const res = await GET(
      new Request("http://localhost:3000/auth/callback?code=perime"),
    );
    expect(location(res)).toBe("http://localhost:3000/connexion?erreur=lien");
  });

  it("lien au format token_hash (modèle e-mail Supabase) : session puis /bienvenue", async () => {
    const fake = fakeSupabase();
    vi.mocked(createClient).mockResolvedValue(fake as never);
    const res = await GET(
      new Request(
        "http://localhost:3000/auth/callback?token_hash=xyz&type=magiclink",
      ),
    );
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "xyz",
      type: "magiclink",
    });
    expect(location(res)).toBe("http://localhost:3000/bienvenue");
  });
});

describe("next.config", () => {
  it("n'est pas en export statique (incompatible avec les routes serveur)", () => {
    expect((nextConfig as { output?: string }).output).not.toBe("export");
  });
});
