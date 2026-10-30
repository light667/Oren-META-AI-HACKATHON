-- ============================================================================
-- Oren - apply_all.sql (genere le 2026-10-30, ne pas editer a la main)
-- Contenu, dans l'ordre : migrations triees par nom, puis le seed.
-- Usage : Supabase Dashboard > SQL Editor > coller tout ce fichier > Run.
-- Projet vide : tout executer. Projet deja initialise : n'executer que les
-- migrations plus recentes que la derniere deja appliquee.
-- Apres execution, verifier avec : npm run check:remote
-- ============================================================================

-- ============================================================================
-- 1/5 - Migration (supabase/migrations/20261030000100_initial_schema.sql)
-- ============================================================================
-- Oren — schéma initial (multi-entreprises).
-- Règles appliquées en base : prix FCFA entiers (jamais de décimaux ni de
-- négatifs), statuts limités à des listes fermées, business_id partout.
-- La RLS est activée dans la migration 20261030000200_rls.sql.

-- ---------------------------------------------------------------------------
-- Utilitaire : updated_at automatique
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- businesses — une ligne par entreprise (pas de table "restaurants")
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  business_type text not null default 'restaurant'
    check (business_type in ('restaurant')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  enabled_capabilities text[] not null default array['catalog_orders']
    check (enabled_capabilities <@ array['catalog_orders', 'bookings', 'appointments']),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_touch_updated_at
  before update on public.businesses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- staff — lié à Supabase Auth (auth.users), rôle owner ou staff
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_business_id_idx on public.staff (business_id);

create trigger staff_touch_updated_at
  before update on public.staff
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- business_info — horaires, adresse, règles, texte libre (1 ligne / entreprise)
-- ---------------------------------------------------------------------------
create table public.business_info (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  opening_hours jsonb not null default '{}'::jsonb
    check (jsonb_typeof(opening_hours) = 'object'),
  address text,
  rules text,
  free_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_info_touch_updated_at
  before update on public.business_info
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- delivery_zones — quartier + frais de livraison en FCFA entier
-- ---------------------------------------------------------------------------
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  neighborhood text not null check (char_length(btrim(neighborhood)) > 0),
  -- Entier, jamais négatif (AGENTS.md règle 10). 0 = livraison gratuite.
  fee_fcfa integer not null check (fee_fcfa >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, neighborhood)
);

create index delivery_zones_business_id_idx on public.delivery_zones (business_id);

create trigger delivery_zones_touch_updated_at
  before update on public.delivery_zones
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- menu_items — catalogue. Prix FCFA entier strictement positif.
-- ---------------------------------------------------------------------------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  description text,
  price_fcfa integer not null check (price_fcfa > 0),
  category text not null default 'divers' check (char_length(btrim(category)) > 0),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_business_id_idx on public.menu_items (business_id);
create index menu_items_business_category_idx on public.menu_items (business_id, category);

create trigger menu_items_touch_updated_at
  before update on public.menu_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- customers — identifiés par téléphone, vérification SMS plus tard
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text,
  phone text not null check (char_length(btrim(phone)) > 0),
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);

create index customers_business_id_idx on public.customers (business_id);

create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- sessions — identifiant anonyme, client optionnel
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  anonymous_id text not null check (char_length(btrim(anonymous_id)) > 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (business_id, anonymous_id)
);

create index sessions_business_id_idx on public.sessions (business_id);
create index sessions_customer_id_idx on public.sessions (customer_id);

-- ---------------------------------------------------------------------------
-- conversations — canal, statut (dont « à reprendre »), assistant en pause
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  channel text not null default 'web'
    check (channel in ('web', 'telegram', 'whatsapp', 'sms')),
  status text not null default 'en_cours'
    check (status in ('en_cours', 'a_reprendre', 'resolue', 'fermee')),
  assistant_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_business_id_idx on public.conversations (business_id);
create index conversations_session_id_idx on public.conversations (session_id);
create index conversations_business_status_idx on public.conversations (business_id, status);

create trigger conversations_touch_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_role text not null
    check (sender_role in ('customer', 'assistant', 'human', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_business_id_idx on public.messages (business_id);
create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- orders — total calculé par le code, jamais par le modèle
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  total_fcfa integer not null check (total_fcfa >= 0),
  delivery_fee_fcfa integer not null default 0 check (delivery_fee_fcfa >= 0),
  payment_method text not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery', 'cash_on_pickup', 'fake', 'mobile_money')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_business_id_idx on public.orders (business_id);
create index orders_business_status_idx on public.orders (business_id, status);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_session_id_idx on public.orders (session_id);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- confirmation_tokens — jeton à usage unique lié à un récapitulatif exact.
-- On stocke un hachage, jamais le jeton en clair.
-- ---------------------------------------------------------------------------
create table public.confirmation_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  token_hash text not null unique check (char_length(btrim(token_hash)) > 0),
  -- Empreinte du récapitulatif confirmé (montants calculés par le code).
  summary_hash text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (used_at is null or used_at >= created_at)
);

create index confirmation_tokens_business_id_idx on public.confirmation_tokens (business_id);
create index confirmation_tokens_order_id_idx on public.confirmation_tokens (order_id);

-- Le jeton courant d'une commande (référence circulaire ajoutée après coup).
alter table public.orders
  add column confirmation_token_id uuid
  references public.confirmation_tokens (id) on delete set null;

create index orders_confirmation_token_id_idx on public.orders (confirmation_token_id);

-- ---------------------------------------------------------------------------
-- order_items — prix figés au moment de la commande (snapshot)
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null check (char_length(btrim(item_name)) > 0),
  unit_price_fcfa integer not null check (unit_price_fcfa > 0),
  quantity integer not null check (quantity > 0),
  line_total_fcfa integer not null check (line_total_fcfa >= 0),
  created_at timestamptz not null default now(),
  check (line_total_fcfa = unit_price_fcfa * quantity)
);

create index order_items_business_id_idx on public.order_items (business_id);
create index order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- audit_log — chaque appel d'outil : qui, quand, entrées, sorties.
-- Écriture seule pour l'application (pas de modification après coup).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_type text not null
    check (actor_type in ('staff', 'customer', 'assistant', 'system')),
  actor_id text,
  tool_name text,
  action text not null check (char_length(btrim(action)) > 0),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_business_id_idx on public.audit_log (business_id);
create index audit_log_business_created_idx on public.audit_log (business_id, created_at);

-- ============================================================================
-- 2/5 - Migration (supabase/migrations/20261030000200_rls.sql)
-- ============================================================================
-- Oren — Row Level Security : isolation par entreprise sur CHAQUE table.
--
-- Modèle d'accès :
-- - Rôle `authenticated` (patron/staff connecté via Supabase Auth) : le staff
--   n'accède qu'aux lignes de SON entreprise (staff.business_id, via auth.uid()).
--   La gestion des lignes `staff` et la modification de `businesses` sont
--   réservées au rôle owner. audit_log est en lecture + ajout seulement.
-- - Rôle `anon` (public) : AUCUN accès direct aux tables. Le public passe
--   par une route serveur (rôle service_role, qui contourne la RLS) qui ne
--   sert que les données de sa propre session (sessions.anonymous_id vérifié
--   côté serveur). Aucune politique anon n'est créée volontairement.
-- - Rôle `service_role` : contourne la RLS (comportement Supabase), réservé
--   au serveur. Ne jamais l'exposer côté client.

-- ---------------------------------------------------------------------------
-- Fonctions d'aide (security definer pour éviter la récursion sur `staff`)
-- ---------------------------------------------------------------------------
create or replace function public.staff_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.business_id
  from public.staff as s
  where s.user_id = auth.uid()
  limit 1
$$;

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.role
  from public.staff as s
  where s.user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_business_staff(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff as s
    where s.user_id = auth.uid()
      and s.business_id = target_business_id
  )
$$;

revoke all on function public.staff_business_id() from public;
revoke all on function public.staff_role() from public;
revoke all on function public.is_business_staff(uuid) from public;
grant execute on function public.staff_business_id() to authenticated, service_role;
grant execute on function public.staff_role() to authenticated, service_role;
grant execute on function public.is_business_staff(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Activation de la RLS sur chaque table (aucune exception)
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.staff enable row level security;
alter table public.business_info enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.menu_items enable row level security;
alter table public.customers enable row level security;
alter table public.sessions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.confirmation_tokens enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Privilèges (les politiques ci-dessous restreignent ensuite par ligne)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on table
  public.businesses, public.staff, public.business_info, public.delivery_zones,
  public.menu_items, public.customers, public.sessions, public.conversations,
  public.messages, public.orders, public.order_items, public.confirmation_tokens,
  public.audit_log
  from authenticated;

grant select, update on public.businesses to authenticated;
grant select, insert, update, delete on public.staff to authenticated;
grant select, insert, update, delete on public.business_info to authenticated;
grant select, insert, update, delete on public.delivery_zones to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
-- Jetons : pas de suppression (un jeton consommé ou expiré reste traçable).
grant select, insert, update on public.confirmation_tokens to authenticated;
-- Journal d'audit : lecture + ajout seulement, jamais de réécriture.
grant select, insert on public.audit_log to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- businesses : visible et modifiable (owner) uniquement par son propre staff.
-- Création/suppression d'entreprise : service_role uniquement (provisioning).
-- ---------------------------------------------------------------------------
create policy businesses_select_own on public.businesses
  for select to authenticated
  using (id = public.staff_business_id());

create policy businesses_update_own_owner on public.businesses
  for update to authenticated
  using (id = public.staff_business_id() and public.staff_role() = 'owner')
  with check (id = public.staff_business_id() and public.staff_role() = 'owner');

-- ---------------------------------------------------------------------------
-- staff : lecture par tout le staff de l'entreprise, écriture owner seulement.
-- ---------------------------------------------------------------------------
create policy staff_select_own_business on public.staff
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy staff_insert_owner on public.staff
  for insert to authenticated
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy staff_update_owner on public.staff
  for update to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner')
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy staff_delete_owner on public.staff
  for delete to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner');

-- ---------------------------------------------------------------------------
-- Tables métier génériques : CRUD complet, limité à sa propre entreprise.
-- business_info, delivery_zones, menu_items, customers, sessions,
-- conversations, messages, orders, order_items.
-- ---------------------------------------------------------------------------
create policy business_info_all_own on public.business_info
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy delivery_zones_all_own on public.delivery_zones
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy menu_items_all_own on public.menu_items
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy customers_all_own on public.customers
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy sessions_all_own on public.sessions
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy conversations_all_own on public.conversations
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy messages_all_own on public.messages
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy orders_all_own on public.orders
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

create policy order_items_all_own on public.order_items
  for all to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

-- ---------------------------------------------------------------------------
-- confirmation_tokens : lecture, création et consommation dans son entreprise.
-- ---------------------------------------------------------------------------
create policy confirmation_tokens_select_own on public.confirmation_tokens
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy confirmation_tokens_insert_own on public.confirmation_tokens
  for insert to authenticated
  with check (business_id = public.staff_business_id());

create policy confirmation_tokens_update_own on public.confirmation_tokens
  for update to authenticated
  using (business_id = public.staff_business_id())
  with check (business_id = public.staff_business_id());

-- ---------------------------------------------------------------------------
-- audit_log : lecture + ajout dans son entreprise, aucune réécriture.
-- ---------------------------------------------------------------------------
create policy audit_log_select_own on public.audit_log
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy audit_log_insert_own on public.audit_log
  for insert to authenticated
  with check (business_id = public.staff_business_id());

-- ============================================================================
-- 3/5 - Migration (supabase/migrations/20261030000300_settings_owner_only.sql)
-- ============================================================================
-- Oren — les réglages sont réservés au rôle owner.
-- Un membre du personnel (staff) voit les commandes et le catalogue,
-- mais ne peut modifier ni les informations de l'entreprise, ni les
-- zones de livraison, ni le menu. Lecture pour tout le staff de
-- l'entreprise, écriture owner uniquement (en plus des règles métier
-- déjà posées dans la migration 20261030000200_rls.sql).
--
-- Ré-exécutable : chaque politique est d'abord supprimée avec
-- « if exists » (ancien et nouveau nom), donc coller ce fichier deux
-- fois dans le SQL Editor donne le même résultat qu'une seule fois.

-- business_info -------------------------------------------------------------
drop policy if exists business_info_all_own on public.business_info;
drop policy if exists business_info_select_own on public.business_info;
drop policy if exists business_info_insert_owner on public.business_info;
drop policy if exists business_info_update_owner on public.business_info;
drop policy if exists business_info_delete_owner on public.business_info;

create policy business_info_select_own on public.business_info
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy business_info_insert_owner on public.business_info
  for insert to authenticated
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy business_info_update_owner on public.business_info
  for update to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner')
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy business_info_delete_owner on public.business_info
  for delete to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner');

-- delivery_zones -------------------------------------------------------------
drop policy if exists delivery_zones_all_own on public.delivery_zones;
drop policy if exists delivery_zones_select_own on public.delivery_zones;
drop policy if exists delivery_zones_insert_owner on public.delivery_zones;
drop policy if exists delivery_zones_update_owner on public.delivery_zones;
drop policy if exists delivery_zones_delete_owner on public.delivery_zones;

create policy delivery_zones_select_own on public.delivery_zones
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy delivery_zones_insert_owner on public.delivery_zones
  for insert to authenticated
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy delivery_zones_update_owner on public.delivery_zones
  for update to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner')
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy delivery_zones_delete_owner on public.delivery_zones
  for delete to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner');

-- menu_items -----------------------------------------------------------------
drop policy if exists menu_items_all_own on public.menu_items;
drop policy if exists menu_items_select_own on public.menu_items;
drop policy if exists menu_items_insert_owner on public.menu_items;
drop policy if exists menu_items_update_owner on public.menu_items;
drop policy if exists menu_items_delete_owner on public.menu_items;

create policy menu_items_select_own on public.menu_items
  for select to authenticated
  using (business_id = public.staff_business_id());

create policy menu_items_insert_owner on public.menu_items
  for insert to authenticated
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy menu_items_update_owner on public.menu_items
  for update to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner')
  with check (business_id = public.staff_business_id() and public.staff_role() = 'owner');

create policy menu_items_delete_owner on public.menu_items
  for delete to authenticated
  using (business_id = public.staff_business_id() and public.staff_role() = 'owner');

-- ============================================================================
-- 4/5 - Migration (supabase/migrations/20261030000400_order_alerts_push.sql)
-- ============================================================================
-- Oren — tableau patron temps réel, alertes et prise de contrôle.
-- Ré-exécutable autant que possible (if exists / if not exists, do blocks).

-- Nouveau statut patron « accepted » (acceptée), entre la réception
-- (confirmed = confirmée par le client, affichée « Reçue ») et la
-- préparation. Les horodatages received_at / accepted_at permettent
-- d'enregistrer et d'afficher le délai d'acceptation.
alter table public.orders
  add column if not exists received_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists owner_notified_at timestamptz,
  add column if not exists fallback_email_sent_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'));

-- Pour que les événements UPDATE de Realtime portent l'ancienne ligne
-- (détecter le passage pending -> confirmed côté patron).
alter table public.orders replica identity full;
alter table public.conversations replica identity full;
alter table public.messages replica identity full;

-- Abonnements Web Push du staff (notification navigateur hors page).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_business_id_idx
  on public.push_subscriptions (business_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid() and business_id = public.staff_business_id());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.push_subscriptions from anon;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Publication Realtime (Supabase) : commandes, conversations, messages.
-- Protégé pour rester exécutable hors Supabase (tests locaux PGlite).
do $$
begin
  if exists (select from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.orders;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.conversations;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

-- ============================================================================
-- 5/5 - Seed de demonstration (supabase/seed.sql)
-- ============================================================================
-- Oren — entreprise de démonstration (restaurant, Lomé).
-- Appliqué par `supabase db reset` en local uniquement (jamais en production).
-- Données fictives de démonstration, inspirées de la photo de menu test/menu.jpg
-- (Chez Chef T : attiéké, riz au gras, frites, alloco). Prix FCFA entiers.

insert into public.businesses (id, name, slug, business_type, config, enabled_capabilities)
values (
  'd0000000-0000-4000-8000-000000000001',
  'Chez Chef T',
  'chez-chef-t',
  'restaurant',
  '{"city": "Lomé", "country": "TG", "currency": "FCFA", "phone": "+228 90 00 00 00"}'::jsonb,
  array['catalog_orders']
)
on conflict (id) do nothing;

insert into public.business_info (business_id, opening_hours, address, rules, free_text)
values (
  'd0000000-0000-4000-8000-000000000001',
  '{"lundi": "10h-22h", "mardi": "10h-22h", "mercredi": "10h-22h", "jeudi": "10h-22h", "vendredi": "10h-23h", "samedi": "10h-23h", "dimanche": "fermé"}'::jsonb,
  'Agoè Zilon, derrière l''école Mariam, Lomé (Togo)',
  'Paiement à la livraison ou sur place. Aucune commande sans confirmation explicite du client.',
  'Restaurant de démonstration pour le hackathon. Cuisine locale : attiéké, riz au gras, frites, alloco.'
)
on conflict (business_id) do nothing;

insert into public.delivery_zones (business_id, neighborhood, fee_fcfa) values
  ('d0000000-0000-4000-8000-000000000001', 'Agoè', 500),
  ('d0000000-0000-4000-8000-000000000001', 'Cacavéli', 800),
  ('d0000000-0000-4000-8000-000000000001', 'Centre-ville', 1000)
on conflict (business_id, neighborhood) do nothing;

insert into public.menu_items (business_id, name, description, price_fcfa, category, available) values
  ('d0000000-0000-4000-8000-000000000001', 'Attiéké poulet', 'Attiéké, poulet, oignons, tomate', 2000, 'attiéké', true),
  ('d0000000-0000-4000-8000-000000000001', 'Attiéké poisson', 'Attiéké, poisson frit, oignons, tomate', 1500, 'attiéké', true),
  ('d0000000-0000-4000-8000-000000000001', 'Riz au gras poulet', 'Riz au gras, poulet, légumes', 2000, 'riz au gras', true),
  ('d0000000-0000-4000-8000-000000000001', 'Riz au gras poisson', 'Riz au gras, poisson, légumes', 1500, 'riz au gras', true),
  ('d0000000-0000-4000-8000-000000000001', 'Frites poulet', 'Frites maison, poulet, mayonnaise', 2000, 'frites', true),
  ('d0000000-0000-4000-8000-000000000001', 'Alloco poulet', 'Bananes plantain frites, poulet', 1500, 'alloco', true),
  ('d0000000-0000-4000-8000-000000000001', 'Salade de fruits', 'Fruits de saison', 1000, 'desserts', true),
  ('d0000000-0000-4000-8000-000000000001', 'Jus de gingembre', 'Boisson maison 50 cl', 500, 'boissons', true)
on conflict do nothing;

-- Patron de démonstration : créer l'utilisateur dans Supabase Auth
-- (dashboard ou `supabase auth`), puis lier ici en remplaçant l'UUID :
-- insert into public.staff (user_id, business_id, role, display_name)
-- values ('<uuid-auth-du-patron>', 'd0000000-0000-4000-8000-000000000001', 'owner', 'Patron démo')
-- on conflict (user_id) do nothing;

