/**
 * Harnais des tests de base de données.
 *
 * Aucun Docker ni CLI Supabase sur la machine : les migrations du dépôt
 * (supabase/migrations/*.sql, écrites pour Supabase) sont appliquées telles
 * quelles sur un vrai PostgreSQL embarqué (PGlite, PostgreSQL en WASM).
 * Seul l'environnement Supabase est simulé AVANT les migrations :
 * schéma `auth` + fonction `auth.uid()` (qui lit app.user_id, posé par les
 * tests comme le ferait un jeton JWT), et les rôles anon/authenticated/
 * service_role. La RLS testée est donc celle des migrations, sans retouche.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

export type Db = PGlite;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export const IDS = {
  businessA: "a0000000-0000-4000-8000-000000000001",
  businessB: "b0000000-0000-4000-8000-000000000002",
  ownerUserA: "a0000000-0000-4000-8000-000000000101",
  ownerUserB: "b0000000-0000-4000-8000-000000000102",
  staffUserA: "a0000000-0000-4000-8000-000000000103",
  spareUser1: "a0000000-0000-4000-8000-000000000201",
  spareUser2: "a0000000-0000-4000-8000-000000000202",
  spareUser3: "a0000000-0000-4000-8000-000000000203",
  spareUser4: "a0000000-0000-4000-8000-000000000204",
  infoA: "a0000000-0000-4000-8000-000000000301",
  infoB: "b0000000-0000-4000-8000-000000000301",
  zoneA: "a0000000-0000-4000-8000-000000000302",
  zoneB: "b0000000-0000-4000-8000-000000000302",
  itemA: "a0000000-0000-4000-8000-000000000303",
  itemB: "b0000000-0000-4000-8000-000000000303",
  customerA: "a0000000-0000-4000-8000-000000000304",
  customerB: "b0000000-0000-4000-8000-000000000304",
  sessionA: "a0000000-0000-4000-8000-000000000305",
  sessionB: "b0000000-0000-4000-8000-000000000305",
  conversationA: "a0000000-0000-4000-8000-000000000306",
  conversationB: "b0000000-0000-4000-8000-000000000306",
  messageA: "a0000000-0000-4000-8000-000000000307",
  messageB: "b0000000-0000-4000-8000-000000000307",
  orderA: "a0000000-0000-4000-8000-000000000308",
  orderB: "b0000000-0000-4000-8000-000000000308",
  orderItemA: "a0000000-0000-4000-8000-000000000309",
  orderItemB: "b0000000-0000-4000-8000-000000000309",
  tokenA: "a0000000-0000-4000-8000-000000000310",
  tokenB: "b0000000-0000-4000-8000-000000000310",
  auditA: "a0000000-0000-4000-8000-000000000311",
  auditB: "b0000000-0000-4000-8000-000000000311",
  staffRowA: "a0000000-0000-4000-8000-000000000312",
  staffRowB: "b0000000-0000-4000-8000-000000000312",
  staffMemberRowA: "a0000000-0000-4000-8000-000000000313",
} as const;

export const ALL_TABLES = [
  "businesses",
  "staff",
  "business_info",
  "delivery_zones",
  "menu_items",
  "customers",
  "sessions",
  "conversations",
  "messages",
  "orders",
  "order_items",
  "confirmation_tokens",
  "audit_log",
] as const;

const SUPABASE_SHIM = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;
grant usage on schema public to anon, authenticated, service_role;
`;

/** Crée une base vierge avec uniquement le shim Supabase (aucune migration). */
export async function createShimOnlyDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  return db;
}

/** Crée une base vierge avec le shim Supabase + toutes les migrations du dépôt. */
export async function createMigratedDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (files.length === 0) throw new Error("Aucune migration trouvée.");
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

/** Exécute `fn` avec un rôle donné (authenticated + auth.uid(), ou anon). */
export async function asRole<T>(
  db: Db,
  role: "authenticated" | "anon" | "service_role",
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.exec(
    `set role ${role}; select set_config('app.user_id', '${userId ?? ""}', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('app.user_id', '', false);`);
  }
}

export const asOwnerA = <T>(db: Db, fn: () => Promise<T>): Promise<T> =>
  asRole(db, "authenticated", IDS.ownerUserA, fn);
export const asOwnerB = <T>(db: Db, fn: () => Promise<T>): Promise<T> =>
  asRole(db, "authenticated", IDS.ownerUserB, fn);
export const asStaffA = <T>(db: Db, fn: () => Promise<T>): Promise<T> =>
  asRole(db, "authenticated", IDS.staffUserA, fn);
export const asAnon = <T>(db: Db, fn: () => Promise<T>): Promise<T> =>
  asRole(db, "anon", null, fn);

/** Insère le jeu de données A/B complet, en admin (contourne la RLS, comme service_role). */
export async function seedTwoBusinesses(db: Db): Promise<void> {
  const a = IDS.businessA;
  const b = IDS.businessB;
  await db.exec(`
    insert into auth.users (id, email) values
      ('${IDS.ownerUserA}', 'patron@a.example'),
      ('${IDS.ownerUserB}', 'patron@b.example'),
      ('${IDS.staffUserA}', 'employe@a.example'),
      ('${IDS.spareUser1}', 'libre1@example'),
      ('${IDS.spareUser2}', 'libre2@example'),
      ('${IDS.spareUser3}', 'libre3@example'),
      ('${IDS.spareUser4}', 'libre4@example');

    insert into public.businesses (id, name, slug) values
      ('${a}', 'Restaurant A', 'restaurant-a'),
      ('${b}', 'Restaurant B', 'restaurant-b');

    insert into public.staff (id, user_id, business_id, role, display_name) values
      ('${IDS.staffRowA}', '${IDS.ownerUserA}', '${a}', 'owner', 'Patron A'),
      ('${IDS.staffRowB}', '${IDS.ownerUserB}', '${b}', 'owner', 'Patron B'),
      ('${IDS.staffMemberRowA}', '${IDS.staffUserA}', '${a}', 'staff', 'Employé A');

    insert into public.business_info (id, business_id, address, rules, free_text) values
      ('${IDS.infoA}', '${a}', 'Adresse A', 'Règles A', 'Texte A'),
      ('${IDS.infoB}', '${b}', 'Adresse B', 'Règles B', 'Texte B');

    insert into public.delivery_zones (id, business_id, neighborhood, fee_fcfa) values
      ('${IDS.zoneA}', '${a}', 'Quartier A', 500),
      ('${IDS.zoneB}', '${b}', 'Quartier B', 900);

    insert into public.menu_items (id, business_id, name, description, price_fcfa, category) values
      ('${IDS.itemA}', '${a}', 'Plat A', 'Description A', 2000, 'cat-a'),
      ('${IDS.itemB}', '${b}', 'Plat B', 'Description B', 3000, 'cat-b');

    insert into public.customers (id, business_id, name, phone) values
      ('${IDS.customerA}', '${a}', 'Client A', '+22890000001'),
      ('${IDS.customerB}', '${b}', 'Client B', '+22890000002');

    insert into public.sessions (id, business_id, customer_id, anonymous_id) values
      ('${IDS.sessionA}', '${a}', '${IDS.customerA}', 'anon-a'),
      ('${IDS.sessionB}', '${b}', '${IDS.customerB}', 'anon-b');

    insert into public.conversations (id, business_id, session_id, customer_id, channel, status) values
      ('${IDS.conversationA}', '${a}', '${IDS.sessionA}', '${IDS.customerA}', 'web', 'en_cours'),
      ('${IDS.conversationB}', '${b}', '${IDS.sessionB}', '${IDS.customerB}', 'web', 'a_reprendre');

    insert into public.messages (id, business_id, conversation_id, sender_role, content) values
      ('${IDS.messageA}', '${a}', '${IDS.conversationA}', 'customer', 'Message A'),
      ('${IDS.messageB}', '${b}', '${IDS.conversationB}', 'customer', 'Message B');

    insert into public.orders (id, business_id, customer_id, session_id, conversation_id, status, total_fcfa, payment_method) values
      ('${IDS.orderA}', '${a}', '${IDS.customerA}', '${IDS.sessionA}', '${IDS.conversationA}', 'confirmed', 2000, 'cash_on_delivery'),
      ('${IDS.orderB}', '${b}', '${IDS.customerB}', '${IDS.sessionB}', '${IDS.conversationB}', 'confirmed', 3000, 'cash_on_delivery');

    insert into public.order_items (id, business_id, order_id, menu_item_id, item_name, unit_price_fcfa, quantity, line_total_fcfa) values
      ('${IDS.orderItemA}', '${a}', '${IDS.orderA}', '${IDS.itemA}', 'Plat A', 2000, 1, 2000),
      ('${IDS.orderItemB}', '${b}', '${IDS.orderB}', '${IDS.itemB}', 'Plat B', 3000, 1, 3000);

    insert into public.confirmation_tokens (id, business_id, order_id, token_hash, expires_at) values
      ('${IDS.tokenA}', '${a}', '${IDS.orderA}', 'hash-a', now() + interval '15 minutes'),
      ('${IDS.tokenB}', '${b}', '${IDS.orderB}', 'hash-b', now() + interval '15 minutes');

    update public.orders set confirmation_token_id = '${IDS.tokenA}' where id = '${IDS.orderA}';
    update public.orders set confirmation_token_id = '${IDS.tokenB}' where id = '${IDS.orderB}';

    insert into public.audit_log (id, business_id, actor_type, actor_id, tool_name, action, input, output) values
      ('${IDS.auditA}', '${a}', 'assistant', 'session-a', 'creer_commande', 'tool_call', '{}', '{}'),
      ('${IDS.auditB}', '${b}', 'assistant', 'session-b', 'creer_commande', 'tool_call', '{}', '{}');
  `);
}
