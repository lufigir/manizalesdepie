-- Dead features, dead columns, dead enum values.
--
-- neighborhood_need, neighborhood_status and situation_report never carried
-- a row that mattered: 0 rides in the first two, and situation_report's one
-- row was press-reporting scaffolding nothing reads any more. touch_closed_road,
-- find_nearby_work_orders and backfill_neighborhoods are orphans left behind
-- by closed_road's removal (20260814042801) and one-off backfills.
--
-- site.merged_into_id and profile.whatsapp: 0 rows carry a value and nothing
-- in the codebase reads them. site_type loses vet_clinic and water_point —
-- 0 rows use either and lib/tabs.ts maps both to null, so the map already
-- refuses to draw them.

drop view neighborhood_status_public;
drop view neighborhood_need_public;

drop table neighborhood_status;
drop table neighborhood_need;
drop table situation_report;

drop type utility_status;
drop type need_priority;

drop function touch_closed_road();
drop function find_nearby_work_orders(double precision, double precision, double precision, integer);
drop function backfill_neighborhoods();

-- site_public and find_nearby_sites depend on site.type (site_type) and on
-- merged_into_id; both are recreated at the end of this file.
drop view site_public;
drop function find_nearby_sites(double precision, double precision, double precision, integer);

alter table site drop constraint site_not_merged_into_itself;
alter table site drop column merged_into_id;

alter table profile drop column whatsapp;

create type site_type_new as enum (
  'collection_point',
  'shelter',
  'blood_donation',
  'medical_post',
  'census_point'
);

alter table site
  alter column type type site_type_new
  using type::text::site_type_new;

drop type site_type;
alter type site_type_new rename to site_type;

create view site_public with (security_invoker = on) as
select s.id, s.type, s.name, s.description, s.address,
       st_x(s.location::geometry) as longitude,
       st_y(s.location::geometry) as latitude,
       n.name as neighborhood,
       s.status, s.schedule, s.whatsapp,
       s.confirmed_count,
       s.confirmed_at, s.expires_at, s.published, s.created_by
from site s
left join neighborhood n on n.id = s.neighborhood_id;

create function find_nearby_sites(lng double precision, lat double precision, radius_m double precision default 50, max_results integer default 5)
returns table(id uuid, name text, type site_type, distance_m double precision)
language sql
stable
set search_path = extensions, pg_temp
as $$
  select s.id, s.name, s.type,
         st_distance(s.location, st_point(lng, lat)::geography) as distance_m
  from public.site s
  where st_dwithin(s.location, st_point(lng, lat)::geography, radius_m)
  order by s.location <-> st_point(lng, lat)::geography
  limit max_results;
$$;

-- updated_at, for the tables that mutate after creation: site (status,
-- reubicación del pin), need and service (added in the next migration),
-- animal_report. confirmed_at means "someone vouched this is still true";
-- updated_at means "a column changed" — the two are not the same signal,
-- so neither reuses the other. touch_updated_at() replaces touch_closed_road
-- in spirit as the one shared before-update stamp. neighborhood (reference
-- data loaded by script), site_item and site_confirmation (append-only)
-- do not get the column.

create function touch_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

alter table site add column updated_at timestamptz not null default now();

create trigger site_touches_updated_at
  before update on site
  for each row execute function touch_updated_at();

alter table animal_report add column updated_at timestamptz not null default now();

create trigger animal_report_touches_updated_at
  before update on animal_report
  for each row execute function touch_updated_at();

-- animal_report.created_by is a foreign key without an index; the table is
-- small today but a join against it should not depend on staying small.
create index animal_report_created_by_idx on animal_report (created_by);
