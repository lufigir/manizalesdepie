-- Manizales de Pie — initial schema
-- Earthquake relief coordination for Manizales and Villamaría (Caldas, Colombia).
--
-- Two rules govern this schema:
--   1. Personal data of affected people lives ONLY in work_order_contact,
--      which is never exposed through a realtime channel and is readable only
--      by the profile that claimed the order and by curators.
--   2. Everything perishable carries expires_at + confirmed_at. Nothing is
--      deleted for being stale; it is labelled stale and demoted.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------- enums ----

create type user_role as enum ('visitor', 'contributor', 'curator');

create type municipality as enum ('manizales', 'villamaria');

create type site_type as enum (
  'collection_point', 'shelter', 'blood_donation',
  'vet_clinic', 'water_point', 'medical_post'
);

create type site_status as enum ('open', 'full', 'closed', 'unknown');

-- What a site wants, refuses, or already has enough of. The "not_accepted"
-- case is the one that matters: the Red Cross explicitly asks people not to
-- donate used clothing, and that has to be visible on the card.
create type item_mode as enum ('needed', 'not_accepted', 'sufficient');

create type call_category as enum (
  'debris_removal', 'logistics', 'census', 'animals',
  'health', 'structural_survey', 'other'
);

create type work_order_category as enum (
  'debris_removal', 'animal_rescue', 'structural_risk',
  'supplies', 'water', 'other'
);

-- The Crisis Cleanup lifecycle. Closing reasons are deliberately honest:
-- "closed_by_others" records that the job was already done on arrival, which
-- is useful information rather than a failure.
create type work_order_status as enum (
  'unclaimed', 'claimed',
  'closed_completed', 'closed_by_others', 'closed_rejected'
);

create type resource_type as enum (
  'dump_truck', 'pickup', 'tools', 'warehouse',
  'free_transport', 'machinery', 'other'
);

create type road_status as enum ('fully_closed', 'partially_open', 'open');

create type confirmation_result as enum ('still_valid', 'changed', 'no_longer_valid');

create type confirmable_entity as enum (
  'site', 'volunteer_call', 'work_order', 'resource_offer', 'closed_road'
);

-- --------------------------------------------------------------- tables ----

create table profile (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       user_role   not null default 'contributor',
  full_name  text        not null,
  whatsapp   text,
  created_at timestamptz not null default now()
);

create table neighborhood (
  id           uuid primary key default gen_random_uuid(),
  name         text         not null,
  municipality municipality not null,
  centroid     geography (point, 4326),
  unique (name, municipality)
);

create table site (
  id              uuid primary key default gen_random_uuid(),
  type            site_type   not null,
  name            text        not null,
  description     text,
  address         text,
  location        geography (point, 4326) not null,
  neighborhood_id uuid references neighborhood (id) on delete set null,
  status          site_status not null default 'unknown',
  schedule        text,
  whatsapp        text,
  source_url      text,
  published       boolean     not null default false,
  verified_by     uuid references profile (id) on delete set null,
  verified_at     timestamptz,
  confirmed_at    timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  merged_into_id  uuid references site (id) on delete set null,
  created_by      uuid references profile (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint site_not_merged_into_itself check (merged_into_id is null or merged_into_id <> id),
  constraint site_verified_pair check ((verified_by is null) = (verified_at is null))
);

create table site_item (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid      not null references site (id) on delete cascade,
  label      text      not null,
  mode       item_mode not null,
  priority   smallint  not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, label, mode)
);

-- An ephemeral gathering, not a registered organization. Volunteer groups here
-- are ten neighbours with shovels, so there is nothing durable to deduplicate:
-- two calls at the same place and hour merge like any other duplicate.
create table volunteer_call (
  id              uuid primary key default gen_random_uuid(),
  title           text          not null,
  category        call_category not null,
  description     text,
  meeting_point   geography (point, 4326) not null,
  meeting_address text,
  neighborhood_id uuid references neighborhood (id) on delete set null,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  slots_total     smallint,
  slots_taken     smallint    not null default 0,
  bring           text,
  whatsapp        text,
  published       boolean     not null default false,
  verified_by     uuid references profile (id) on delete set null,
  verified_at     timestamptz,
  confirmed_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  merged_into_id  uuid references volunteer_call (id) on delete set null,
  created_by      uuid        not null references profile (id) on delete cascade,
  created_at      timestamptz not null default now(),
  constraint call_slots_within_total check (slots_total is null or slots_taken <= slots_total),
  constraint call_slots_not_negative check (slots_taken >= 0),
  constraint call_ends_after_start check (ends_at is null or ends_at > starts_at)
);

-- The public half of a request for help. approx_location is deliberately
-- block-level: it is never the real address. See work_order_contact.
create table work_order (
  id              uuid primary key default gen_random_uuid(),
  category        work_order_category not null,
  description     text                not null,
  approx_location geography (point, 4326) not null,
  neighborhood_id uuid references neighborhood (id) on delete set null,
  status          work_order_status not null default 'unclaimed',
  claimed_by      uuid references profile (id) on delete set null,
  claimed_at      timestamptz,
  releases_at     timestamptz,
  closed_at       timestamptz,
  published       boolean     not null default false,
  verified_by     uuid references profile (id) on delete set null,
  verified_at     timestamptz,
  confirmed_at    timestamptz not null default now(),
  merged_into_id  uuid references work_order (id) on delete set null,
  reported_by     uuid references profile (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint work_order_claim_is_complete
    check (status <> 'claimed' or (claimed_by is not null and releases_at is not null)),
  constraint work_order_not_merged_into_itself
    check (merged_into_id is null or merged_into_id <> id)
);

-- Personal data of an affected person, often reported by a third party.
-- Never joined into a public view, never published on a realtime channel.
-- Row-level security below is the only thing standing between this table and
-- a directory of damaged houses during a looting curfew.
create table work_order_contact (
  work_order_id uuid primary key references work_order (id) on delete cascade,
  exact_address text        not null,
  contact_name  text,
  phone         text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Every read of work_order_contact is recorded. Curators can see who looked
-- at what; that visibility is what deters casual curiosity.
create table work_order_access (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid        not null references work_order (id) on delete cascade,
  profile_id    uuid        not null references profile (id) on delete cascade,
  viewed_at     timestamptz not null default now()
);

create table resource_offer (
  id              uuid primary key default gen_random_uuid(),
  type            resource_type not null,
  description     text          not null,
  quantity        smallint,
  area            text,
  location        geography (point, 4326),
  whatsapp        text        not null,
  available_from  timestamptz,
  available_until timestamptz,
  published       boolean     not null default false,
  verified_by     uuid references profile (id) on delete set null,
  verified_at     timestamptz,
  confirmed_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  created_by      uuid        not null references profile (id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- Curated by hand on purpose: the INVIAS API serves the road network, not the
-- daily closures, which are published only as PDF bulletins.
create table closed_road (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  segment      text,
  path         geography (linestring, 4326),
  marker       geography (point, 4326),
  status       road_status not null,
  cause        text,
  source       text,
  source_url   text,
  published    boolean     not null default true,
  confirmed_at timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '48 hours',
  updated_at   timestamptz not null default now()
);

-- Append-only log with a loose reference (entity + entity_id, no foreign key).
-- The one purity concession in this schema, taken instead of three identical
-- confirmation tables. The live counter lives denormalized on each table's
-- confirmed_at, because the map reads it on every render.
create table confirmation (
  id         uuid primary key default gen_random_uuid(),
  entity     confirmable_entity  not null,
  entity_id  uuid                not null,
  result     confirmation_result not null,
  note       text,
  created_by uuid references profile (id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- indexes ----

create index site_location_idx          on site using gist (location);
create index site_live_idx              on site (published, status, expires_at);
create index site_neighborhood_idx      on site (neighborhood_id);
create index site_item_site_idx         on site_item (site_id);

create index call_meeting_point_idx     on volunteer_call using gist (meeting_point);
create index call_today_idx             on volunteer_call (published, starts_at, expires_at);

create index work_order_location_idx    on work_order using gist (approx_location);
create index work_order_board_idx       on work_order (published, status, releases_at);
create index work_order_claimed_by_idx  on work_order (claimed_by);
create index work_order_access_order_idx on work_order_access (work_order_id);

create index resource_offer_live_idx    on resource_offer (published, expires_at);
create index resource_offer_location_idx on resource_offer using gist (location);

create index closed_road_marker_idx     on closed_road using gist (marker);
create index confirmation_entity_idx    on confirmation (entity, entity_id, created_at desc);

-- ------------------------------------------------------------- triggers ----

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Anónimo')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function touch_closed_road()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger closed_road_touch
  before update on closed_road
  for each row execute function touch_closed_road();

-- ------------------------------------------------------------- functions ---

create or replace function is_curator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile
    where id = (select auth.uid()) and role = 'curator'
  );
$$;

-- Duplicate detection at the moment of reporting, which is where it is cheap.
-- The <-> operator uses the GiST index when it appears in an ORDER BY.
create or replace function find_nearby_sites(
  lng          double precision,
  lat          double precision,
  radius_m     double precision default 50,
  max_results  integer          default 5
)
returns table (id uuid, name text, type site_type, distance_m double precision)
language sql
stable
set search_path = ''
as $$
  select s.id,
         s.name,
         s.type,
         st_distance(s.location, st_point(lng, lat)::geography) as distance_m
  from public.site s
  where s.merged_into_id is null
    and st_dwithin(s.location, st_point(lng, lat)::geography, radius_m)
  order by s.location <-> st_point(lng, lat)::geography
  limit max_results;
$$;

create or replace function find_nearby_work_orders(
  lng          double precision,
  lat          double precision,
  radius_m     double precision default 50,
  max_results  integer          default 5
)
returns table (id uuid, description text, status work_order_status, distance_m double precision)
language sql
stable
set search_path = ''
as $$
  select w.id,
         w.description,
         w.status,
         st_distance(w.approx_location, st_point(lng, lat)::geography) as distance_m
  from public.work_order w
  where w.merged_into_id is null
    and w.published
    and st_dwithin(w.approx_location, st_point(lng, lat)::geography, radius_m)
  order by w.approx_location <-> st_point(lng, lat)::geography
  limit max_results;
$$;

-- A claim that goes 48 hours without progress returns to unclaimed on its own.
-- Scheduled with pg_cron in production; safe to call by hand meanwhile.
create or replace function release_stale_claims()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  released integer;
begin
  update public.work_order
     set status      = 'unclaimed',
         claimed_by  = null,
         claimed_at  = null,
         releases_at = null
   where status = 'claimed'
     and releases_at < now();
  get diagnostics released = row_count;
  return released;
end;
$$;

-- ------------------------------------------------------- row level security -

alter table profile            enable row level security;
alter table neighborhood       enable row level security;
alter table site               enable row level security;
alter table site_item          enable row level security;
alter table volunteer_call     enable row level security;
alter table work_order         enable row level security;
alter table work_order_contact enable row level security;
alter table work_order_access  enable row level security;
alter table resource_offer     enable row level security;
alter table closed_road        enable row level security;
alter table confirmation       enable row level security;

-- Reference data is public.
create policy neighborhood_read_all on neighborhood
  for select using (true);

create policy closed_road_read_published on closed_road
  for select using (published);

-- Published rows are readable by anyone, signed in or not. This is the whole
-- point of the product: nobody needs an account to find a shelter.
create policy site_read_published on site
  for select using (published or is_curator());

create policy site_item_read_published on site_item
  for select using (
    exists (select 1 from site s where s.id = site_id and (s.published or is_curator()))
  );

create policy volunteer_call_read_published on volunteer_call
  for select using (published or is_curator());

create policy resource_offer_read_published on resource_offer
  for select using (published or is_curator());

create policy work_order_read_published on work_order
  for select using (published or is_curator());

-- The sensitive half. Readable only by the profile holding the claim, and by
-- curators. Anonymous visitors never see it, whatever the work order says.
create policy work_order_contact_read_claimant on work_order_contact
  for select using (
    is_curator()
    or exists (
      select 1 from work_order w
      where w.id = work_order_id
        and w.claimed_by = (select auth.uid())
        and w.status = 'claimed'
    )
  );

create policy work_order_access_read_own on work_order_access
  for select using (is_curator() or profile_id = (select auth.uid()));

create policy work_order_access_insert_self on work_order_access
  for insert with check (profile_id = (select auth.uid()));

create policy confirmation_read_all on confirmation
  for select using (true);

create policy confirmation_insert_signed_in on confirmation
  for insert with check ((select auth.uid()) is not null);

create policy profile_read_own on profile
  for select using (id = (select auth.uid()) or is_curator());

create policy profile_update_own on profile
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Writes to the mapped entities go through the server-side data layer with the
-- service role, so no INSERT/UPDATE policy is granted to anon or authenticated
-- here. Adding one later would silently open a second write path; don't.

-- ----------------------------------------------------------------- views ---
-- PostgREST serialises a geography column as WKB hex, which is useless to a
-- map. These views project it to plain longitude/latitude and flatten the
-- neighbourhood name.
--
-- security_invoker = on is load-bearing: without it the view would run with the
-- definer's rights and quietly bypass every policy above.

create view site_public with (security_invoker = on) as
select s.id,
       s.type,
       s.name,
       s.description,
       s.address,
       st_x(s.location::geometry) as longitude,
       st_y(s.location::geometry) as latitude,
       n.name                     as neighborhood,
       s.status,
       s.schedule,
       s.whatsapp,
       s.source_url,
       (s.verified_at is not null) as verified,
       s.confirmed_at,
       s.expires_at,
       s.published,
       s.created_by
from site s
left join neighborhood n on n.id = s.neighborhood_id
where s.merged_into_id is null;

create view work_order_public with (security_invoker = on) as
select w.id,
       w.category,
       w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name                            as neighborhood,
       w.status,
       w.claimed_by,
       w.releases_at,
       (w.verified_at is not null) as verified,
       w.confirmed_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;
