/**
 * Isolation par entreprise — critère de la tâche.
 *
 * Deux entreprises A et B sont créées (fixtures du harnais). Connecté comme
 * patron de A (rôle authenticated, auth.uid() = patron A), on prouve pour
 * CHAQUE table : A ne lit aucune ligne de B, n'en crée aucune chez B, ne
 * modifie ni ne supprime celle de B — et, en contrôle positif, A lit et
 * écrit bien chez lui (sinon un « tout interdire » passerait à tort).
 * Le rôle anon (public) n'a aucun accès direct ; service_role (route
 * serveur) contourne la RLS, comme chez Supabase.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ALL_TABLES,
  IDS,
  asAnon,
  asOwnerA,
  asRole,
  asStaffA,
  createMigratedDb,
  seedTwoBusinesses,
  type Db,
} from "./harness";

let db: Db;
let markerSeq = 0;
const marker = (): string => `iso${++markerSeq}`;

interface DmlOutcome {
  affected: number;
  error: string | null;
}

async function tryDml(sql: string): Promise<DmlOutcome> {
  try {
    const result = await db.query(sql);
    return { affected: result.affectedRows ?? 0, error: null };
  } catch (error) {
    return { affected: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function adminCount(sql: string): Promise<number> {
  const result = await db.query<{ n: number }>(sql);
  return Number(result.rows[0]?.n ?? 0);
}

async function adminScalar(sql: string): Promise<string | null> {
  const result = await db.query<Record<string, unknown>>(sql);
  const row = result.rows[0];
  if (!row) return null;
  return String(Object.values(row)[0]);
}

const A = IDS.businessA;
const B = IDS.businessB;

interface TableCase {
  table: string;
  /** Ligne amorce de B (lecture ciblée interdite). */
  bRowId: string;
  aRowId: string;
  /** Nombre de lignes de B (pour vérifier qu'une écriture croisée n'a rien créé). */
  countB: string;
  insertCross: (m: string) => string;
  insertOwn?: (m: string) => string;
  updateOwn?: string;
  updateCross: string;
  deleteCross: string;
  /** Valeur témoin de la ligne B, vérifiée inchangée après les tentatives. */
  witness: { sql: string; expected: string };
}

const CASES: TableCase[] = [
  {
    table: "businesses",
    bRowId: B,
    aRowId: A,
    countB: `select count(*) as n from businesses where id = '${B}'`,
    insertCross: (m) =>
      `insert into businesses (name, slug) values ('Intrusion ${m}', 'intrusion-${m}')`,
    // Pas d'insertOwn : la création d'entreprise est réservée au service serveur.
    updateOwn: `update businesses set name = 'Restaurant A (modifié)' where id = '${A}'`,
    updateCross: `update businesses set name = 'Pwned' where id = '${B}'`,
    deleteCross: `delete from businesses where id = '${B}'`,
    witness: { sql: `select name from businesses where id = '${B}'`, expected: "Restaurant B" },
  },
  {
    table: "staff",
    bRowId: IDS.staffRowB,
    aRowId: IDS.staffRowA,
    countB: `select count(*) as n from staff where business_id = '${B}'`,
    insertCross: () =>
      `insert into staff (user_id, business_id, role) values ('${IDS.spareUser1}', '${B}', 'staff')`,
    insertOwn: () =>
      `insert into staff (user_id, business_id, role, display_name) values ('${IDS.spareUser2}', '${A}', 'staff', 'Ajouté par A') returning id`,
    updateCross: `update staff set role = 'staff' where id = '${IDS.staffRowB}'`,
    deleteCross: `delete from staff where id = '${IDS.staffRowB}'`,
    witness: { sql: `select role from staff where id = '${IDS.staffRowB}'`, expected: "owner" },
  },
  {
    table: "business_info",
    bRowId: IDS.infoB,
    aRowId: IDS.infoA,
    countB: `select count(*) as n from business_info where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into business_info (business_id, address) values ('${B}', 'Intrusion ${m}')`,
    updateOwn: `update business_info set rules = 'Règles A modifiées' where id = '${IDS.infoA}'`,
    updateCross: `update business_info set address = 'Pwned' where id = '${IDS.infoB}'`,
    deleteCross: `delete from business_info where id = '${IDS.infoB}'`,
    witness: { sql: `select address from business_info where id = '${IDS.infoB}'`, expected: "Adresse B" },
  },
  {
    table: "delivery_zones",
    bRowId: IDS.zoneB,
    aRowId: IDS.zoneA,
    countB: `select count(*) as n from delivery_zones where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into delivery_zones (business_id, neighborhood, fee_fcfa) values ('${B}', 'Zone ${m}', 100)`,
    insertOwn: (m) =>
      `insert into delivery_zones (business_id, neighborhood, fee_fcfa) values ('${A}', 'Zone ${m}', 100) returning id`,
    updateCross: `update delivery_zones set fee_fcfa = 1 where id = '${IDS.zoneB}'`,
    deleteCross: `delete from delivery_zones where id = '${IDS.zoneB}'`,
    witness: { sql: `select fee_fcfa from delivery_zones where id = '${IDS.zoneB}'`, expected: "900" },
  },
  {
    table: "menu_items",
    bRowId: IDS.itemB,
    aRowId: IDS.itemA,
    countB: `select count(*) as n from menu_items where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into menu_items (business_id, name, price_fcfa, category) values ('${B}', 'Plat ${m}', 1000, 'x')`,
    insertOwn: (m) =>
      `insert into menu_items (business_id, name, price_fcfa, category) values ('${A}', 'Plat ${m}', 1000, 'x') returning id`,
    updateCross: `update menu_items set price_fcfa = 1 where id = '${IDS.itemB}'`,
    deleteCross: `delete from menu_items where id = '${IDS.itemB}'`,
    witness: { sql: `select price_fcfa from menu_items where id = '${IDS.itemB}'`, expected: "3000" },
  },
  {
    table: "customers",
    bRowId: IDS.customerB,
    aRowId: IDS.customerA,
    countB: `select count(*) as n from customers where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into customers (business_id, name, phone) values ('${B}', 'Client ${m}', '+2289100${m}')`,
    insertOwn: (m) =>
      `insert into customers (business_id, name, phone) values ('${A}', 'Client ${m}', '+2289200${m}') returning id`,
    updateCross: `update customers set name = 'Pwned' where id = '${IDS.customerB}'`,
    deleteCross: `delete from customers where id = '${IDS.customerB}'`,
    witness: { sql: `select name from customers where id = '${IDS.customerB}'`, expected: "Client B" },
  },
  {
    table: "sessions",
    bRowId: IDS.sessionB,
    aRowId: IDS.sessionA,
    countB: `select count(*) as n from sessions where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into sessions (business_id, anonymous_id) values ('${B}', 'anon-${m}')`,
    insertOwn: (m) =>
      `insert into sessions (business_id, anonymous_id) values ('${A}', 'anon-${m}') returning id`,
    updateCross: `update sessions set anonymous_id = 'pwned' where id = '${IDS.sessionB}'`,
    deleteCross: `delete from sessions where id = '${IDS.sessionB}'`,
    witness: { sql: `select anonymous_id from sessions where id = '${IDS.sessionB}'`, expected: "anon-b" },
  },
  {
    table: "conversations",
    bRowId: IDS.conversationB,
    aRowId: IDS.conversationA,
    countB: `select count(*) as n from conversations where business_id = '${B}'`,
    insertCross: () =>
      `insert into conversations (business_id, session_id) values ('${B}', '${IDS.sessionB}')`,
    insertOwn: () =>
      `insert into conversations (business_id, session_id) values ('${A}', '${IDS.sessionA}') returning id`,
    updateCross: `update conversations set status = 'fermee' where id = '${IDS.conversationB}'`,
    deleteCross: `delete from conversations where id = '${IDS.conversationB}'`,
    witness: { sql: `select status from conversations where id = '${IDS.conversationB}'`, expected: "a_reprendre" },
  },
  {
    table: "messages",
    bRowId: IDS.messageB,
    aRowId: IDS.messageA,
    countB: `select count(*) as n from messages where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into messages (business_id, conversation_id, sender_role, content) values ('${B}', '${IDS.conversationB}', 'customer', 'Intrusion ${m}')`,
    insertOwn: (m) =>
      `insert into messages (business_id, conversation_id, sender_role, content) values ('${A}', '${IDS.conversationA}', 'customer', 'Message ${m}') returning id`,
    updateCross: `update messages set content = 'Pwned' where id = '${IDS.messageB}'`,
    deleteCross: `delete from messages where id = '${IDS.messageB}'`,
    witness: { sql: `select content from messages where id = '${IDS.messageB}'`, expected: "Message B" },
  },
  {
    table: "orders",
    bRowId: IDS.orderB,
    aRowId: IDS.orderA,
    countB: `select count(*) as n from orders where business_id = '${B}'`,
    insertCross: () =>
      `insert into orders (business_id, total_fcfa) values ('${B}', 1000)`,
    insertOwn: () =>
      `insert into orders (business_id, total_fcfa) values ('${A}', 1000) returning id`,
    updateCross: `update orders set total_fcfa = 1 where id = '${IDS.orderB}'`,
    deleteCross: `delete from orders where id = '${IDS.orderB}'`,
    witness: { sql: `select total_fcfa from orders where id = '${IDS.orderB}'`, expected: "3000" },
  },
  {
    table: "order_items",
    bRowId: IDS.orderItemB,
    aRowId: IDS.orderItemA,
    countB: `select count(*) as n from order_items where business_id = '${B}'`,
    insertCross: () =>
      `insert into order_items (business_id, order_id, item_name, unit_price_fcfa, quantity, line_total_fcfa) values ('${B}', '${IDS.orderB}', 'Intrusion', 100, 1, 100)`,
    insertOwn: () =>
      `insert into order_items (business_id, order_id, item_name, unit_price_fcfa, quantity, line_total_fcfa) values ('${A}', '${IDS.orderA}', 'Ajout A', 100, 1, 100) returning id`,
    updateCross: `update order_items set quantity = 99, line_total_fcfa = 9900 where id = '${IDS.orderItemB}'`,
    deleteCross: `delete from order_items where id = '${IDS.orderItemB}'`,
    witness: { sql: `select quantity from order_items where id = '${IDS.orderItemB}'`, expected: "1" },
  },
  {
    table: "confirmation_tokens",
    bRowId: IDS.tokenB,
    aRowId: IDS.tokenA,
    countB: `select count(*) as n from confirmation_tokens where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into confirmation_tokens (business_id, order_id, token_hash, expires_at) values ('${B}', '${IDS.orderB}', 'hash-${m}', now() + interval '15 minutes')`,
    insertOwn: (m) =>
      `insert into confirmation_tokens (business_id, order_id, token_hash, expires_at) values ('${A}', '${IDS.orderA}', 'hash-${m}', now() + interval '15 minutes') returning id`,
    updateCross: `update confirmation_tokens set used_at = now() where id = '${IDS.tokenB}'`,
    deleteCross: `delete from confirmation_tokens where id = '${IDS.tokenB}'`,
    witness: {
      sql: `select coalesce(used_at::text, 'non-utilise') from confirmation_tokens where id = '${IDS.tokenB}'`,
      expected: "non-utilise",
    },
  },
  {
    table: "audit_log",
    bRowId: IDS.auditB,
    aRowId: IDS.auditA,
    countB: `select count(*) as n from audit_log where business_id = '${B}'`,
    insertCross: (m) =>
      `insert into audit_log (business_id, actor_type, action) values ('${B}', 'system', 'intrusion-${m}')`,
    insertOwn: (m) =>
      `insert into audit_log (business_id, actor_type, action) values ('${A}', 'system', 'action-${m}') returning id`,
    updateCross: `update audit_log set action = 'pwned' where id = '${IDS.auditB}'`,
    deleteCross: `delete from audit_log where id = '${IDS.auditB}'`,
    witness: { sql: `select action from audit_log where id = '${IDS.auditB}'`, expected: "tool_call" },
  },
];

beforeAll(async () => {
  db = await createMigratedDb();
  await seedTwoBusinesses(db);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("RLS activée sur chaque table", () => {
  it("rowsecurity = true pour les 13 tables, sans exception", async () => {
    const result = await db.query<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
    );
    const byTable = new Map(result.rows.map((r) => [r.tablename, r.rowsecurity]));
    for (const table of ALL_TABLES) {
      expect(byTable.get(table), `RLS manquante sur ${table}`).toBe(true);
    }
  });
});

describe.each(CASES)("isolation — table $table", (testCase) => {
  it("A ne lit aucune ligne de B, mais lit les siennes", async () => {
    await asOwnerA(db, async () => {
      const cross = await db.query(
        `select id from ${testCase.table} where id = '${testCase.bRowId}'`,
      );
      expect(cross.rows).toHaveLength(0);
      const all = await db.query<{ business_id?: string; id: string }>(
        `select * from ${testCase.table}`,
      );
      for (const row of all.rows) {
        const owner = (row as { business_id?: string }).business_id;
        if (owner !== undefined) expect(owner).toBe(A);
        else expect(row.id).toBe(A); // table businesses : la ligne elle-même
      }
      const own = await db.query(
        `select id from ${testCase.table} where id = '${testCase.aRowId}'`,
      );
      expect(own.rows).toHaveLength(1);
    });
  });

  it("A ne peut ni créer, ni modifier, ni supprimer chez B", async () => {
    const before = await adminCount(testCase.countB);
    await asOwnerA(db, async () => {
      const insert = await tryDml(testCase.insertCross(marker()));
      expect(insert.affected, `insertion croisée acceptée sur ${testCase.table}`).toBe(0);
      const update = await tryDml(testCase.updateCross);
      expect(update.affected, `modification croisée acceptée sur ${testCase.table}`).toBe(0);
      const del = await tryDml(testCase.deleteCross);
      expect(del.affected, `suppression croisée acceptée sur ${testCase.table}`).toBe(0);
    });
    expect(await adminCount(testCase.countB)).toBe(before);
    expect(await adminScalar(testCase.witness.sql)).toBe(testCase.witness.expected);
  });

  it("A écrit bien chez lui (contrôle positif)", async () => {
    await asOwnerA(db, async () => {
      if (testCase.insertOwn) {
        const inserted = await db.query<{ id: string }>(testCase.insertOwn(marker()));
        expect(inserted.rows[0]?.id).toBeTruthy();
        const reread = await db.query(
          `select id from ${testCase.table} where id = '${inserted.rows[0].id}'`,
        );
        expect(reread.rows).toHaveLength(1);
      } else if (testCase.updateOwn) {
        const updated = await db.query(testCase.updateOwn);
        expect(updated.affectedRows).toBe(1);
      } else {
        throw new Error(`Cas ${testCase.table} sans contrôle positif`);
      }
    });
  });
});

describe("rôles", () => {
  it("anon (public) n'a aucun accès direct à aucune table", async () => {
    for (const table of ALL_TABLES) {
      await asAnon(db, async () => {
        await expect(db.query(`select id from ${table} limit 1`)).rejects.toThrow(
          /permission denied/i,
        );
      });
    }
  });

  it("service_role (route serveur) lit toutes les entreprises", async () => {
    await asRole(db, "service_role", null, async () => {
      const result = await db.query<{ n: number }>(`select count(*) as n from businesses`);
      expect(Number(result.rows[0].n)).toBe(2);
    });
  });

  it("un employé (staff) ne peut pas gérer le staff ni modifier l'entreprise", async () => {
    await asStaffA(db, async () => {
      const insertStaff = await tryDml(
        `insert into staff (user_id, business_id, role) values ('${IDS.spareUser3}', '${A}', 'staff')`,
      );
      expect(insertStaff.affected).toBe(0);
      const updateBusiness = await tryDml(
        `update businesses set name = 'Non' where id = '${A}'`,
      );
      expect(updateBusiness.affected).toBe(0);
      // Mais il lit bien le catalogue de son entreprise.
      const items = await db.query(`select id from menu_items where id = '${IDS.itemA}'`);
      expect(items.rows).toHaveLength(1);
    });
  });

  it("le patron de B ne voit pas A non plus (symétrie)", async () => {
    await asRole(db, "authenticated", IDS.ownerUserB, async () => {
      const cross = await db.query(`select id from menu_items where id = '${IDS.itemA}'`);
      expect(cross.rows).toHaveLength(0);
      const own = await db.query(`select id from menu_items where id = '${IDS.itemB}'`);
      expect(own.rows).toHaveLength(1);
    });
  });
});
