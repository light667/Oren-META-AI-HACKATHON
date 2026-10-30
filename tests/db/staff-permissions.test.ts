/**
 * Droits limités du personnel — critère de la tâche.
 *
 * Un membre du personnel (rôle staff) voit les commandes de son
 * entreprise, mais ne peut modifier AUCUN réglage : informations de
 * l'entreprise, zones de livraison, menu, ni l'entreprise elle-même
 * (migration 20261030000300_settings_owner_only.sql). Le patron
 * (owner) peut tout faire : contrôle positif inclus.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  IDS,
  asOwnerA,
  asStaffA,
  createMigratedDb,
  seedTwoBusinesses,
  type Db,
} from "./harness";

let db: Db;
const A = IDS.businessA;

async function tryDml(sql: string): Promise<number> {
  try {
    const result = await db.query(sql);
    return result.affectedRows ?? 0;
  } catch {
    return 0;
  }
}

async function adminScalar(sql: string): Promise<string | null> {
  const result = await db.query<Record<string, unknown>>(sql);
  const row = result.rows[0];
  return row ? String(Object.values(row)[0]) : null;
}

beforeAll(async () => {
  db = await createMigratedDb();
  await seedTwoBusinesses(db);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("un membre du personnel ne peut pas modifier les réglages", () => {
  it("lecture OK : commandes, menu et infos de son entreprise", async () => {
    await asStaffA(db, async () => {
      for (const [table, id] of [
        ["orders", IDS.orderA],
        ["menu_items", IDS.itemA],
        ["business_info", IDS.infoA],
        ["delivery_zones", IDS.zoneA],
      ] as const) {
        const rows = await db.query(`select id from ${table} where id = '${id}'`);
        expect(rows.rows, `${table} illisible pour le staff`).toHaveLength(1);
      }
    });
  });

  it("écriture refusée sur business_info, zones, menu et businesses", async () => {
    await asStaffA(db, async () => {
      expect(await tryDml(`update business_info set rules = 'pirate' where id = '${IDS.infoA}'`)).toBe(0);
      expect(await tryDml(`update delivery_zones set fee_fcfa = 1 where id = '${IDS.zoneA}'`)).toBe(0);
      expect(await tryDml(`insert into delivery_zones (business_id, neighborhood, fee_fcfa) values ('${A}', 'Zone pirate', 1)`)).toBe(0);
      expect(await tryDml(`update menu_items set price_fcfa = 1 where id = '${IDS.itemA}'`)).toBe(0);
      expect(await tryDml(`insert into menu_items (business_id, name, price_fcfa) values ('${A}', 'Plat pirate', 1)`)).toBe(0);
      expect(await tryDml(`update menu_items set available = false where id = '${IDS.itemA}'`)).toBe(0);
      expect(await tryDml(`update businesses set name = 'Pirate' where id = '${A}'`)).toBe(0);
    });
    // Rien n'a bougé, vérifié en admin.
    expect(await adminScalar(`select rules from business_info where id = '${IDS.infoA}'`)).toBe("Règles A");
    expect(await adminScalar(`select fee_fcfa from delivery_zones where id = '${IDS.zoneA}'`)).toBe("500");
    expect(await adminScalar(`select price_fcfa from menu_items where id = '${IDS.itemA}'`)).toBe("2000");
    expect(await adminScalar(`select name from businesses where id = '${A}'`)).toBe("Restaurant A");
  });

  it("mais il peut faire avancer une commande (travail opérationnel)", async () => {
    await asStaffA(db, async () => {
      const updated = await tryDml(
        `update orders set status = 'preparing' where id = '${IDS.orderA}'`,
      );
      expect(updated).toBe(1);
    });
    expect(await adminScalar(`select status from orders where id = '${IDS.orderA}'`)).toBe("preparing");
  });
});

describe("le patron, lui, modifie les réglages (contrôle positif)", () => {
  it("business_info, zones et menu sont modifiables par l'owner", async () => {
    await asOwnerA(db, async () => {
      expect(await tryDml(`update business_info set rules = 'Règles du patron' where id = '${IDS.infoA}'`)).toBe(1);
      expect(await tryDml(`update delivery_zones set fee_fcfa = 700 where id = '${IDS.zoneA}'`)).toBe(1);
      expect(await tryDml(`update menu_items set price_fcfa = 2500, available = false where id = '${IDS.itemA}'`)).toBe(1);
      const inserted = await db.query<{ id: string }>(
        `insert into menu_items (business_id, name, price_fcfa, category) values ('${A}', 'Nouveau plat', 1800, 'nouveautés') returning id`,
      );
      expect(inserted.rows[0]?.id).toBeTruthy();
    });
    expect(await adminScalar(`select rules from business_info where id = '${IDS.infoA}'`)).toBe("Règles du patron");
    expect(await adminScalar(`select price_fcfa from menu_items where id = '${IDS.itemA}'`)).toBe("2500");
  });
});
