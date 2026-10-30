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
