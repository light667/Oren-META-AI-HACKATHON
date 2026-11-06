-- Oren — liaison des comptes Firebase Auth aux comptes Supabase.
-- Firebase gère l'identité (e-mail + mot de passe, vérification d'e-mail,
-- Google). Chaque compte Firebase vérifié est relié à UN compte
-- auth.users propre, qui porte toute la RLS existante (auth.uid(),
-- staff.user_id). Table d'identité, pas table métier : pas de business_id.
-- Accès : service_role uniquement (route serveur /api/auth/session).

create table if not exists public.auth_identities (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique check (length(firebase_uid) between 1 and 128),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null check (length(email) between 3 and 320),
  provider text not null default 'password' check (length(provider) between 1 and 64),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

alter table public.auth_identities enable row level security;
-- Aucune politique : ni anon ni authenticated n'y ont accès.
revoke all on public.auth_identities from anon, authenticated;
grant all on public.auth_identities to service_role;

-- Recherche d'un compte Supabase existant par e-mail (comptes créés avant
-- la migration, ou invités). service_role uniquement.
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1
$$;

revoke all on function public.auth_user_id_by_email(text) from public;
revoke all on function public.auth_user_id_by_email(text) from anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
