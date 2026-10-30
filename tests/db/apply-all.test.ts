/**
 * Garde-fou du fichier à coller dans le SQL Editor Supabase :
 * supabase/apply_all.sql (migrations + seed, dans l'ordre) doit
 * s'appliquer d'un bloc sur une base vierge et produire le même
 * résultat que les migrations appliquées une à une.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ALL_TABLES, createShimOnlyDb, type Db } from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createShimOnlyDb();
  const sql = readFileSync(join(process.cwd(), "supabase", "apply_all.sql"), "utf8");
  await db.exec(sql);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("supabase/apply_all.sql", () => {
  it("crée les 13 tables avec la RLS activée", async () => {
    const result = await db.query<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
    );
    expect(result.rows.map((r) => r.tablename)).toEqual([...ALL_TABLES].sort());
    for (const row of result.rows) expect(row.rowsecurity).toBe(true);
    const policies = await db.query<{ n: number }>(
      `select count(*) as n from pg_policies where schemaname = 'public'`,
    );
    expect(Number(policies.rows[0].n)).toBeGreaterThan(0);
  });

  it("la migration droits staff (003) est ré-exécutable sans erreur", async () => {
    // Régression : un DROP POLICY sans IF EXISTS échouait au second collage
    // dans le SQL Editor (ERROR 42704, politique déjà supprimée).
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "20261030000300_settings_owner_only.sql",
      ),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const policies = await db.query<{ policyname: string }>(
      `select policyname from pg_policies
       where schemaname = 'public' and tablename = 'menu_items' order by policyname`,
    );
    expect(policies.rows.map((r) => r.policyname)).toEqual([
      "menu_items_delete_owner",
      "menu_items_insert_owner",
      "menu_items_select_own",
      "menu_items_update_owner",
    ]);
  });

  it("contient le seed : Chez Chef T, 8 plats, 3 zones", async () => {
    const business = await db.query<{ id: string }>(
      `select id from businesses where slug = 'chez-chef-t'`,
    );
    expect(business.rows).toHaveLength(1);
    const demoId = "d0000000-0000-4000-8000-000000000001";
    expect(business.rows[0].id).toBe(demoId);
    const items = await db.query<{ n: number }>(
      `select count(*) as n from menu_items where business_id = '${demoId}'`,
    );
    expect(Number(items.rows[0].n)).toBe(8);
    const zones = await db.query<{ n: number }>(
      `select count(*) as n from delivery_zones where business_id = '${demoId}'`,
    );
    expect(Number(zones.rows[0].n)).toBe(3);
  });
});
