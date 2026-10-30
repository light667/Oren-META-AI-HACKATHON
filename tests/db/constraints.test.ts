/**
 * Contraintes en base et seed de démonstration.
 * Les contraintes sont vérifiées en admin : elles doivent tenir quel que
 * soit le rôle, y compris si le code applicatif se trompe.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IDS, createMigratedDb, seedTwoBusinesses, type Db } from "./harness";

let db: Db;
const A = IDS.businessA;

beforeAll(async () => {
  db = await createMigratedDb();
  await seedTwoBusinesses(db);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("contraintes FCFA et statuts", () => {
  it("refuse un prix nul, négatif ou un total négatif", async () => {
    await expect(
      db.query(`insert into menu_items (business_id, name, price_fcfa) values ('${A}', 'Gratuit', 0)`),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(`insert into menu_items (business_id, name, price_fcfa) values ('${A}', 'Négatif', -500)`),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(`insert into orders (business_id, total_fcfa) values ('${A}', -1)`),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(`insert into delivery_zones (business_id, neighborhood, fee_fcfa) values ('${A}', 'Zone négative', -100)`),
    ).rejects.toThrow(/check|violat/i);
  });

  it("refuse les statuts hors liste fermée", async () => {
    await expect(
      db.query(`insert into orders (business_id, status, total_fcfa) values ('${A}', 'archivee', 1000)`),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(
        `insert into conversations (business_id, session_id, status) values ('${A}', '${IDS.sessionA}', 'archivee')`,
      ),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(`insert into staff (user_id, business_id, role) values ('${IDS.spareUser4}', '${A}', 'admin')`),
    ).rejects.toThrow(/check|violat/i);
    await expect(
      db.query(`insert into businesses (name, slug, business_type) values ('Hôtel', 'hotel-test', 'hotel')`),
    ).rejects.toThrow(/check|violat/i);
  });

  it("refuse une ligne de commande incohérente (total ≠ prix × quantité)", async () => {
    await expect(
      db.query(
        `insert into order_items (business_id, order_id, item_name, unit_price_fcfa, quantity, line_total_fcfa)
         values ('${A}', '${IDS.orderA}', 'Incohérent', 1000, 2, 1500)`,
      ),
    ).rejects.toThrow(/check|violat/i);
  });

  it("accepte les valeurs valides, dont conversation « à reprendre » et assistant en pause", async () => {
    const conv = await db.query<{ assistant_paused: boolean; status: string }>(
      `insert into conversations (business_id, session_id, status, assistant_paused)
       values ('${A}', '${IDS.sessionA}', 'a_reprendre', true) returning status, assistant_paused`,
    );
    expect(conv.rows[0]).toMatchObject({ status: "a_reprendre", assistant_paused: true });
    const customer = await db.query<{ phone_verified_at: string | null }>(
      `select phone_verified_at from customers where id = '${IDS.customerA}'`,
    );
    expect(customer.rows[0].phone_verified_at).toBeNull();
  });
});

describe("seed de démonstration", () => {
  it("crée le restaurant Chez Chef T avec catalogue et zones", async () => {
    const seedDb = await createMigratedDb();
    try {
      await seedDb.exec(readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8"));
      const business = await seedDb.query<{ name: string; business_type: string; enabled_capabilities: string[] }>(
        `select name, business_type, enabled_capabilities from businesses where slug = 'chez-chef-t'`,
      );
      expect(business.rows[0]?.name).toBe("Chez Chef T");
      expect(business.rows[0]?.business_type).toBe("restaurant");
      expect(business.rows[0]?.enabled_capabilities).toContain("catalog_orders");
      const items = await seedDb.query<{ n: number }>(
        `select count(*) as n from menu_items where business_id = 'd0000000-0000-4000-8000-000000000001' and price_fcfa > 0`,
      );
      expect(Number(items.rows[0].n)).toBe(8);
      const zones = await seedDb.query<{ n: number }>(
        `select count(*) as n from delivery_zones where business_id = 'd0000000-0000-4000-8000-000000000001'`,
      );
      expect(Number(zones.rows[0].n)).toBe(3);
    } finally {
      await seedDb.close();
    }
  }, 120_000);
});
