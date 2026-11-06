/**
 * Liaison Firebase → Supabase : la table auth_identities et la fonction
 * auth_user_id_by_email ne sont accessibles qu'au service_role (route
 * serveur /api/auth/session). Un membre connecté ne peut ni lire les
 * liaisons des autres, ni chercher un compte par e-mail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asRole, createMigratedDb, IDS, type Db } from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createMigratedDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${IDS.ownerUserA}', 'patron-a@exemple.tg'),
      ('${IDS.ownerUserB}', 'patron-b@exemple.tg');
    insert into public.auth_identities (firebase_uid, user_id, email)
      values ('fb-uid-a', '${IDS.ownerUserA}', 'patron-a@exemple.tg');
  `);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("auth_identities", () => {
  it("authenticated ne lit aucune liaison, même la sienne", async () => {
    await asRole(db, "authenticated", IDS.ownerUserA, async () => {
      await expect(db.query(`select * from public.auth_identities`)).rejects.toThrow(
        /permission denied/i,
      );
    });
  });

  it("authenticated ne peut pas chercher un compte par e-mail", async () => {
    await asRole(db, "authenticated", IDS.ownerUserA, async () => {
      await expect(
        db.query(`select public.auth_user_id_by_email('patron-b@exemple.tg')`),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("service_role retrouve un compte par e-mail, sans tenir compte de la casse", async () => {
    await asRole(db, "service_role", null, async () => {
      const r = await db.query<{ id: string | null }>(
        `select public.auth_user_id_by_email('  Patron-B@Exemple.TG ') as id`,
      );
      expect(r.rows[0].id).toBe(IDS.ownerUserB);
    });
  });

  it("un compte Firebase ne se relie qu'à un seul compte Supabase, et inversement", async () => {
    await expect(
      db.exec(`insert into public.auth_identities (firebase_uid, user_id, email)
               values ('fb-uid-a', '${IDS.ownerUserB}', 'x@exemple.tg')`),
    ).rejects.toThrow(/duplicate|unique/i);
    await expect(
      db.exec(`insert into public.auth_identities (firebase_uid, user_id, email)
               values ('fb-uid-autre', '${IDS.ownerUserA}', 'x@exemple.tg')`),
    ).rejects.toThrow(/duplicate|unique/i);
  });
});
