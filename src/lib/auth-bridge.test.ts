import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSessionTokenHash, linkFirebaseIdentity } from "./auth-bridge";

type U = { id: string; email: string; user_metadata: Record<string, unknown> };

/** Faux client admin Supabase : auth.users + auth_identities en mémoire. */
function fakeAdmin(seed: { users?: U[]; links?: Array<{ firebase_uid: string; user_id: string; email: string }> } = {}) {
  const users = new Map((seed.users ?? []).map((u) => [u.id, u]));
  const links = [...(seed.links ?? [])];
  let n = 0;
  const admin = {
    rpc: async (_fn: string, { p_email }: { p_email: string }) => ({
      data: [...users.values()].find((u) => u.email === p_email.toLowerCase())?.id ?? null,
      error: null,
    }),
    from: () => ({
      select: () => ({
        eq: (_c: string, uid: string) => ({
          maybeSingle: async () => ({ data: links.find((l) => l.firebase_uid === uid) ?? null }),
        }),
      }),
      upsert: async (row: { firebase_uid: string; user_id: string; email: string }) => {
        const i = links.findIndex((l) => l.firebase_uid === row.firebase_uid);
        if (i >= 0) links[i] = row;
        else links.push(row);
        return { error: null };
      },
    }),
    auth: {
      admin: {
        createUser: async (attrs: { email: string; user_metadata: Record<string, unknown> }) => {
          const user = { id: `new-${++n}`, email: attrs.email, user_metadata: attrs.user_metadata };
          users.set(user.id, user);
          return { data: { user }, error: null };
        },
        getUserById: async (id: string) => ({ data: { user: users.get(id) ?? null }, error: null }),
        updateUserById: async (id: string, attrs: Partial<U>) => {
          const user = { ...users.get(id)!, ...attrs };
          users.set(id, user);
          return { data: { user }, error: null };
        },
        generateLink: async () => ({ data: { properties: { hashed_token: "hash-123" } }, error: null }),
      },
    },
  };
  return { admin: admin as unknown as SupabaseClient, users, links };
}

const identity = { uid: "fb-1", email: "patron@exemple.tg", emailVerified: true, provider: "password" };

describe("linkFirebaseIdentity", () => {
  it("crée un compte Supabase propre au premier passage, avec les données d'inscription", async () => {
    const { admin, links } = fakeAdmin();
    const r = await linkFirebaseIdentity(admin, identity, { business_name: "Chez Chef T" });
    expect(r.ok && r.created).toBe(true);
    expect(r.ok && r.user.user_metadata.business_name).toBe("Chez Chef T");
    expect(links).toHaveLength(1);
    expect(links[0].firebase_uid).toBe("fb-1");
  });

  it("retrouve le même compte aux connexions suivantes (pas de doublon)", async () => {
    const { admin, users } = fakeAdmin();
    const first = await linkFirebaseIdentity(admin, identity);
    const second = await linkFirebaseIdentity(admin, identity);
    expect(first.ok && second.ok && first.user.id === second.user.id).toBe(true);
    expect(users.size).toBe(1);
  });

  it("relie un compte d'avant la migration (ou un invité) par son e-mail vérifié", async () => {
    const invited: U = {
      id: "old-1",
      email: "patron@exemple.tg",
      user_metadata: { business_id: "biz-1", role: "staff" },
    };
    const { admin, users } = fakeAdmin({ users: [invited] });
    const r = await linkFirebaseIdentity(admin, identity, { business_name: "Ignoré" });
    expect(r.ok && r.user.id).toBe("old-1");
    expect(r.ok && r.created).toBe(false);
    // Les métadonnées d'invitation ne sont pas écrasées.
    expect(users.get("old-1")!.user_metadata).toEqual({ business_id: "biz-1", role: "staff" });
  });

  it("deux comptes Firebase distincts donnent deux comptes Supabase distincts", async () => {
    const { admin } = fakeAdmin();
    const a = await linkFirebaseIdentity(admin, identity);
    const b = await linkFirebaseIdentity(admin, { ...identity, uid: "fb-2", email: "autre@exemple.tg" });
    expect(a.ok && b.ok && a.user.id !== b.user.id).toBe(true);
  });

  it("refuse de fusionner si le nouvel e-mail appartient déjà à un autre compte", async () => {
    const { admin } = fakeAdmin({
      users: [
        { id: "u1", email: "ancien@exemple.tg", user_metadata: {} },
        { id: "u2", email: "patron@exemple.tg", user_metadata: {} },
      ],
      links: [{ firebase_uid: "fb-1", user_id: "u1", email: "ancien@exemple.tg" }],
    });
    const r = await linkFirebaseIdentity(admin, identity);
    expect(r).toEqual({ ok: false, reason: "email_mismatch" });
  });
});

describe("createSessionTokenHash", () => {
  it("renvoie le jeton à usage unique, sans envoi d'e-mail", async () => {
    const { admin } = fakeAdmin();
    expect(await createSessionTokenHash(admin, "patron@exemple.tg")).toBe("hash-123");
  });
});
