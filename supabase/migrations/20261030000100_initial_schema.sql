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
