-- Expand phase, per project-architecture/references/database.md: table
-- names go lowercase-plural, a rename on a live table is a remove-and-add
-- wearing a disguise, so every renamed table gets a same-shaped view under
-- its old name (security_invoker = on, plain single-table select, so it
-- stays auto-updatable) while any code still deployed under the old names
-- finishes rolling out. The contract migration that drops these views and
-- the columns/types they cover is written separately and NOT applied here.
--
-- Known gap, called out rather than papered over: work_order.status /
-- need.status went through an in-place ALTER TYPE in the previous
-- migration (20260818020000), before this plural/expand-contract pass was
-- requested. Its old labels ('unclaimed', 'claimed') no longer exist
-- anywhere in the database, so the work_order compat view below can alias
-- columns but cannot restore those two labels — inserting the literal
-- string 'unclaimed' through the compat view will fail. needs.state is
-- added regardless, to leave the table in the shape the contract migration
-- expects, but it is a plain duplicate of status from day one: there is no
-- old-value data left for it to dual-write against.

set lock_timeout = '3s';
set statement_timeout = '60s';
set idle_in_transaction_session_timeout = '60s';

-- 1. rename tables to plural ------------------------------------------------

alter table site rename to sites;
alter table site_item rename to site_items;
alter table animal_report rename to animal_reports;
alter table neighborhood rename to neighborhoods;
alter table profile rename to profiles;
alter table need rename to needs;
alter table need_update rename to need_updates;
alter table service rename to services;
alter table confirmation rename to site_confirmations;

-- 1b. functions whose bodies hardcode the old table names, recreated right
-- after the renames and before any statement below can fire a trigger that
-- calls them (set_neighborhood_from_location -> neighborhood_at, notably).
-- Views are not touched here: Postgres resolves a view's stored query by
-- relation OID, so site_public/etc. already read from the renamed tables
-- without being recreated.

create or replace function bump_confirmation_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.result = 'no_longer_valid' then
    return new;
  end if;

  update public.sites set confirmed_count = confirmed_count + 1, confirmed_at = now()
   where id = coalesce(new.site_id, new.entity_id);

  return new;
end;
$function$;

create or replace function find_nearby_sites(lng double precision, lat double precision, radius_m double precision default 50, max_results integer default 5)
returns table(id uuid, name text, type site_type, distance_m double precision)
language sql
stable
set search_path = extensions, pg_temp
as $$
  select s.id, s.name, s.type,
         st_distance(s.location, st_point(lng, lat)::geography) as distance_m
  from public.sites s
  where st_dwithin(s.location, st_point(lng, lat)::geography, radius_m)
  order by s.location <-> st_point(lng, lat)::geography
  limit max_results;
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  bootstrap_email constant text := 'luisgir827@gmail.com';
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Anónimo'),
    case
      when new.email = bootstrap_email then 'curator'::public.user_role
      else 'contributor'::public.user_role
    end
  );
  return new;
end;
$function$;

create or replace function is_curator()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'curator'
  );
$function$;

create or replace function neighborhood_at(lng double precision, lat double precision)
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select n.id
  from public.neighborhoods n
  where n.boundary is not null
    and extensions.st_covers(n.boundary, extensions.st_point(lng, lat)::extensions.geography)
  limit 1;
$function$;

create or replace function upsert_neighborhood(p_name text, p_comuna text, p_geojson text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  shape extensions.geometry := extensions.st_multi(extensions.st_geomfromgeojson(p_geojson));
  result uuid;
begin
  insert into public.neighborhoods (name, municipality, comuna, boundary, centroid)
  values (p_name, 'manizales', p_comuna, shape::extensions.geography,
          extensions.st_centroid(shape)::extensions.geography)
  on conflict (name, municipality) do update set
    comuna   = excluded.comuna,
    boundary = excluded.boundary,
    centroid = excluded.centroid
  returning id into result;

  return result;
end;
$function$;

create or replace function sync_need_state()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_id         uuid := coalesce(new.need_id, old.need_id);
  going             integer;
  helped            integer;
  last_helped       timestamptz;
  last_still_needed timestamptz;
  is_reopened       boolean;
  current_status    public.need_status;
  next_status       public.need_status;
begin
  select count(*) filter (where kind = 'on_the_way'),
         count(*) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'still_needed')
    into going, helped, last_helped, last_still_needed
  from public.need_updates
  where need_id = target_id;

  select status into current_status
  from public.needs where id = target_id;

  if current_status in ('closed_rejected', 'closed_completed') then
    update public.needs
       set on_the_way_count = coalesce(going, 0),
           helped_count     = coalesce(helped, 0)
     where id = target_id;
    return null;
  end if;

  is_reopened := last_still_needed is not null
             and (last_helped is null or last_still_needed > last_helped);

  next_status := case
    when coalesce(helped, 0) >= 1 then 'attended'
    when coalesce(going,  0) >= 1 then 'on_the_way'
    else 'pending'
  end;

  update public.needs
     set on_the_way_count = coalesce(going, 0),
         helped_count     = coalesce(helped, 0),
         reopened         = is_reopened,
         status           = next_status,
         state             = next_status,
         confirmed_at     = now(),
         closed_at        = null,
         expires_at       = null
   where id = target_id;

  return null;
end;
$function$;

-- 2. timestamps everywhere, including tables previously judged append-only --

alter table neighborhoods add column created_at timestamptz not null default now();
alter table neighborhoods add column updated_at timestamptz not null default now();
create trigger neighborhoods_touch_updated_at
  before update on neighborhoods
  for each row execute function touch_updated_at();

alter table site_items add column updated_at timestamptz not null default now();
create trigger site_items_touch_updated_at
  before update on site_items
  for each row execute function touch_updated_at();

alter table site_confirmations add column updated_at timestamptz not null default now();
create trigger site_confirmations_touch_updated_at
  before update on site_confirmations
  for each row execute function touch_updated_at();

-- 3. site_confirmations: add the real FK column alongside entity/entity_id --
-- (entity, entity_id stay untouched during expand; dropping them is a
-- contract-phase change)

alter table site_confirmations add column site_id uuid;
-- one row (527684cf-c6ce-4d82-bfb2-346143ee6949) points at a site that no
-- longer exists; entity_id was never a real FK, so nothing enforced that
-- before. It keeps entity/entity_id for the audit trail and gets site_id
-- left null rather than failing the whole migration on a pre-existing
-- integrity gap.
update site_confirmations sc set site_id = entity_id
  where site_id is null
    and exists (select 1 from sites s where s.id = sc.entity_id);
alter table site_confirmations
  add constraint site_confirmations_site_id_fkey
  foreign key (site_id) references sites(id) on delete cascade not valid;
alter table site_confirmations
  validate constraint site_confirmations_site_id_fkey;

create index site_confirmations_site_id_idx on site_confirmations (site_id);

-- RLS was already enabled on the table this used to be (confirmation) and
-- survives the rename; grants do not survive dropping the default-ACL
-- breadth the old table carried, so they are tightened explicitly here:
-- anon/authenticated get exactly select and insert, nothing else.
revoke all on table site_confirmations from anon, authenticated;
grant select, insert on table site_confirmations to anon, authenticated;

alter policy confirmation_insert_anyone on site_confirmations
  rename to site_confirmations_insert_anyone;
alter policy confirmation_read_all on site_confirmations
  rename to site_confirmations_read_all;

-- 4. needs.state: the eventual replacement for status, added as a plain
-- column so a later contract migration can drop status and rename this.
-- No relabeling happens here (see note above) because status already holds
-- the final label set.

alter table needs add column state need_status;
update needs set state = status where state is null;

-- 6. rename the *_public views to plural ------------------------------------

alter view site_public rename to sites_public;
alter view neighborhood_public rename to neighborhoods_public;
alter view animal_report_public rename to animal_reports_public;
alter view need_public rename to needs_public;
alter view need_update_public rename to need_updates_public;
alter view service_public rename to services_public;

-- 7. compat *_public views under the old names (read-only pass-throughs) ---

create view site_public with (security_invoker = on) as
  select * from sites_public;
create view neighborhood_public with (security_invoker = on) as
  select * from neighborhoods_public;
create view animal_report_public with (security_invoker = on) as
  select * from animal_reports_public;
create view need_public with (security_invoker = on) as
  select * from needs_public;
create view need_update_public with (security_invoker = on) as
  select * from need_updates_public;
create view service_public with (security_invoker = on) as
  select * from services_public;

-- pre-20260818020000 names, in case any deployed reader still expects them
create view work_order_public with (security_invoker = on) as
  select id, category, description, longitude, latitude, neighborhood,
         status, on_the_way_count as attendee_count, helped_count, reopened,
         exact_address, contact_name, phone, notes, confirmed_at, expires_at,
         created_at, published
  from needs_public;

create view work_order_update_public with (security_invoker = on) as
  select id, need_id as work_order_id, kind, name, phone, note, created_at
  from need_updates_public;

create view resource_offer_public with (security_invoker = on) as
  select * from services_public;

grant select on sites_public, neighborhoods_public, animal_reports_public,
  needs_public, need_updates_public, services_public,
  site_public, neighborhood_public, animal_report_public,
  need_public, need_update_public, service_public,
  work_order_public, work_order_update_public, resource_offer_public
  to anon, authenticated;

-- 8. compat base-table views under the old names ----------------------------

create view site with (security_invoker = on) as select * from sites;
create view profile with (security_invoker = on) as select * from profiles;
create view neighborhood with (security_invoker = on) as select * from neighborhoods;
create view animal_report with (security_invoker = on) as select * from animal_reports;
create view site_item with (security_invoker = on) as select * from site_items;
create view need with (security_invoker = on) as select * from needs;
create view need_update with (security_invoker = on) as
  select id, need_id, name, phone, created_at, note, kind from need_updates;
create view service with (security_invoker = on) as select * from services;
create view confirmation with (security_invoker = on) as select * from site_confirmations;

create view work_order with (security_invoker = on) as
  select id, category, description,
         location as approx_location,
         neighborhood_id, status, closed_at, published, confirmed_at,
         created_by as reported_by, created_at,
         on_the_way_count as attendee_count,
         expires_at, exact_address, contact_name, phone, notes,
         helped_count, reopened, updated_at
  from needs;

create view work_order_update with (security_invoker = on) as
  select id, need_id as work_order_id, name, phone, created_at, note, kind
  from need_updates;

create view resource_offer with (security_invoker = on) as
  select * from services;

-- 9. realtime: sites only, never needs (phone/address for affected people) --

alter publication supabase_realtime add table sites;
