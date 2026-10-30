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
