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
  '{"lundi": "24h/24", "mardi": "24h/24", "mercredi": "24h/24", "jeudi": "24h/24", "vendredi": "24h/24", "samedi": "24h/24", "dimanche": "24h/24"}'::jsonb,
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
