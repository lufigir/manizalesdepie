-- The barrio, resolved from geometry instead of typed by hand.
--
-- `neighborhood` shipped with a centroid and nine rows entered manually, and it
-- shows: of the seven published sites, three say nothing about where they are.
-- "Coliseo Menor" is a name; "Coliseo Menor, Palogrande" is directions. That
-- gap is on the shared WhatsApp card, in the list beside the map and in the
-- text filter, which is three places one missing field is felt.
--
-- Now the table carries the official barrio polygons — SIG Alcaldía de
-- Manizales, "Límite de barrios", the division set by Acuerdo Municipal 589 de
-- 2004 — and a trigger stamps the barrio on every row that has a location.
--
-- In the database rather than in the DAL on purpose. The two spreadsheets of
-- real cases (debris and families) are going to be loaded straight into
-- Postgres over MCP, never through a form, and a rule that only exists in
-- application code would silently skip every one of those rows.
--
-- Villamaría has no equivalent dataset, so rows across the river resolve to
-- null. Null is right: it says "we do not know", which is true.

-- ------------------------------------------------------------- the shapes --

alter table neighborhood
  add column boundary geography (multipolygon, 4326),
  -- The comuna each barrio belongs to, straight from the same source. It is
  -- the honest unit for anything that counts, and this is the only place the
  -- two arrive already joined.
  add column comuna text;

-- The index the containment lookup rides. Without it every insert scans 114
-- polygons; with it the trigger costs nothing worth measuring.
create index neighborhood_boundary_idx on neighborhood using gist (boundary);

-- ------------------------------------------------------------ the lookup ---

-- Which barrio a point falls in, or null outside the city.
--
-- security definer because the trigger below runs during an anonymous insert
-- through the DAL, and the lookup has to see every barrio regardless of who is
-- writing. It reads one table and returns one uuid; there is no surface here to
-- abuse.
create or replace function neighborhood_at(
  lng double precision,
  lat double precision
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select n.id
  from public.neighborhood n
  where n.boundary is not null
    and extensions.st_covers(n.boundary, extensions.st_point(lng, lat)::extensions.geography)
  limit 1;
$$;

revoke execute on function neighborhood_at(double precision, double precision)
  from public, anon, authenticated;

-- ----------------------------------------------------------- the stamping --

-- Fills neighborhood_id from whichever geography column the table uses. The
-- column name is passed as a trigger argument, so one function serves site,
-- volunteer_call, work_order and resource_offer instead of four near-copies
-- drifting apart.
--
-- A neighborhood_id set explicitly by a curator wins: correcting the machine
-- has to be possible, and a curator who moves a row into the right barrio
-- should not have it moved back on the next update.
create or replace function set_neighborhood_from_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  location_column text := tg_argv[0];
  point extensions.geography;
begin
  execute format('select ($1).%I', location_column)
    into point
    using new;

  if point is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.neighborhood_id is distinct from old.neighborhood_id then
    return new;
  end if;

  new.neighborhood_id := public.neighborhood_at(
    extensions.st_x(point::extensions.geometry),
    extensions.st_y(point::extensions.geometry)
  );

  return new;
end;
$fn$;

revoke execute on function set_neighborhood_from_location() from public, anon, authenticated;

create trigger site_sets_neighborhood
  before insert or update of location on site
  for each row execute function set_neighborhood_from_location('location');

create trigger volunteer_call_sets_neighborhood
  before insert or update of meeting_point on volunteer_call
  for each row execute function set_neighborhood_from_location('meeting_point');

create trigger work_order_sets_neighborhood
  before insert or update of approx_location on work_order
  for each row execute function set_neighborhood_from_location('approx_location');

create trigger resource_offer_sets_neighborhood
  before insert or update of location on resource_offer
  for each row execute function set_neighborhood_from_location('location');

-- ------------------------------------------------------------- the barrios --
--
-- The polygons themselves are NOT in this migration. They are 145 KB of
-- geometry regenerated from the Alcaldía's service by
-- `node scripts/fetch-barrios.mjs`, which writes supabase/barrios.sql — an
-- idempotent upsert applied with:
--
--   npx supabase db execute --file supabase/barrios.sql
--
-- Kept out of migrations because a migration is applied once and never looked
-- at again: when the Alcaldía updates the layer, editing an applied migration
-- would change nothing in a database that already ran it. The upsert can be run
-- as many times as the source changes.
--
-- Until it runs, every neighborhood_id resolves to null and nothing breaks.
