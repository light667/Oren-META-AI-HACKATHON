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
