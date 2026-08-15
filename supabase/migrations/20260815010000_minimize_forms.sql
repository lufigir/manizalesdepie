-- Cutting the fields nobody fills in, 15 August.
--
-- Measured, not guessed: 46 resource offers with quantity, available_from,
-- available_until, location and neighborhood_id empty in every row; 13 calls
-- with ends_at, slots_total, bring and whatsapp filled once each; one single
-- row in call_attendance in the life of the application; 10 of the 13 calls
-- with no title at all, which is to say informal.
--
-- The conclusion drawn from those numbers is that a grupo is not a shift
-- somebody schedules and staffs. It is "alguien se está juntando aquí". The
-- formal half of the feature — an hour, a roster, a cap on it — described a
-- thing that never happened, and every field of it cost a screen to the people
-- reporting the thing that did.
--
-- The confirmation counter survives, because it is the opposite case: eight
-- confirmations against one signup make it the most used interaction here. It
-- just stops existing on the four tables that never had a button to feed it,
-- where "Sin confirmar" was a verdict nobody could ever answer.

-- ------------------------------------------------------------------- views --
-- Dropped first so their columns can go, recreated at the bottom. Every one
-- keeps security_invoker: without it they bypass RLS entirely.

drop view volunteer_call_public;
drop view resource_offer_public;
drop view work_order_public;
drop view animal_report_public;
drop view neighborhood_status_public;
drop view neighborhood_need_public;
drop view site_public;

-- ------------------------------------------------------------- attendance --
-- The roster, its counter, and the constraint that made the counter mean
-- something. One person used it.

drop trigger if exists call_attendance_syncs_slots on call_attendance;
drop function if exists sync_call_slots();
drop table call_attendance;

-- `call_slots_within_total` and `call_slots_not_negative` are check
-- constraints over these two columns, so Postgres drops them along with the
-- columns. Naming them here would fail: there is nothing left to name.
alter table volunteer_call drop column slots_total;
alter table volunteer_call drop column slots_taken;

-- ------------------------------------------------------------------ grupos --
-- `title` goes with the formal form that asked for it. Readers never lost it:
-- `CallDAL.toDTO` has always synthesised "Escombros en Chipre" from the
-- category and the barrio for the informal rows, and now does so for all of
-- them. `ends_at` follows: with no stated hour to start from there is no
-- stated hour to end at, and expiry is the end of the day in Bogotá.

-- `call_ends_after_start` goes the same way `slots` did: it is a check
-- constraint over `ends_at`, dropped with the column it guards.
alter table volunteer_call drop column title;
alter table volunteer_call drop column ends_at;
alter table volunteer_call drop column bring;

-- The duplicate check loses the title it used to show. The category is what
-- names a grupo now, so it is what comes back.
--
-- Dropped rather than replaced: `create or replace` cannot change a
-- function's return type, and this one's RETURNS TABLE loses `title`.
drop function find_nearby_calls(
  double precision, double precision, timestamp with time zone,
  double precision, integer, integer
);

create function find_nearby_calls(
  lng double precision,
  lat double precision,
  at timestamp with time zone,
  radius_m double precision default 150,
  window_hours integer default 3,
  max_results integer default 5
)
returns table (
  id uuid,
  category call_category,
  neighborhood text,
  starts_at timestamp with time zone,
  distance_m double precision
)
language sql
stable
set search_path to 'extensions', 'pg_temp'
as $fn$
  select c.id,
         c.category,
         n.name,
         c.starts_at,
         st_distance(c.meeting_point, st_point(lng, lat)::geography) as distance_m
  from public.volunteer_call c
  left join public.neighborhood n on n.id = c.neighborhood_id
  where c.merged_into_id is null
    and c.published
    and st_dwithin(c.meeting_point, st_point(lng, lat)::geography, radius_m)
    and c.starts_at between at - make_interval(hours => window_hours)
                        and at + make_interval(hours => window_hours)
  order by c.meeting_point <-> st_point(lng, lat)::geography
  limit max_results;
$fn$;

-- --------------------------------------------------------------- servicios --
-- "¿Cuántos?" and a pair of datetime pickers, on a form whose real answer is
-- "tengo una volqueta, llámeme". Empty 46 times out of 46.

alter table resource_offer drop column quantity;
alter table resource_offer drop column available_from;
alter table resource_offer drop column available_until;

-- ------------------------------------------------------------------ fuente --
-- The press link a curator pasted while seeding. It answered a question about
-- us rather than about where to go today, and no form ever asked for it.

alter table site drop column source_url;
alter table neighborhood_status drop column source;
alter table neighborhood_status drop column source_url;
-- A frente's source was carried all the way into the DTO and never rendered
-- by anything. Dead either way; it goes with the rest of "Fuente".
alter table neighborhood_need drop column source;

-- ------------------------------------------------------- confidence counter --
-- Only `site` has ever had a way to confirm anything: three buttons in its
-- popup, no account. The counter on the other four tables could only ever
-- read zero, and a zero rendered as "Sin confirmar" is a claim about the
-- world that nothing in the application could have refuted.

alter table volunteer_call drop column confirmed_count;
alter table work_order     drop column confirmed_count;
alter table resource_offer drop column confirmed_count;
alter table animal_report  drop column confirmed_count;

-- Rows that fed a counter that no longer exists. Deleted rather than kept as
-- history: they point at columns this migration removed, so nothing can read
-- them back into a number again.
delete from confirmation where entity <> 'site';

alter table confirmation
  add constraint confirmation_site_only check (entity = 'site');

create or replace function bump_confirmation_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- "no_longer_valid" still does not increment. Someone saying a place is gone
  -- is not evidence that it is there.
  if new.result = 'no_longer_valid' then
    return new;
  end if;

  update public.site set confirmed_count = confirmed_count + 1, confirmed_at = now()
   where id = new.entity_id;

  return new;
end;
$fn$;

revoke execute on function bump_confirmation_count() from public, anon, authenticated;

-- ------------------------------------------------------------------- views --

create view site_public with (security_invoker = on) as
select s.id, s.type, s.name, s.description, s.address,
       st_x(s.location::geometry) as longitude,
       st_y(s.location::geometry) as latitude,
       n.name as neighborhood,
       s.status, s.schedule, s.whatsapp,
       (s.verified_at is not null) as verified,
       s.confirmed_count,
       s.confirmed_at, s.expires_at, s.published, s.created_by
from site s
left join neighborhood n on n.id = s.neighborhood_id
where s.merged_into_id is null;

create view volunteer_call_public with (security_invoker = on) as
select c.id, c.category, c.description,
       st_x(c.meeting_point::geometry) as longitude,
       st_y(c.meeting_point::geometry) as latitude,
       c.meeting_address,
       n.name as neighborhood,
       c.starts_at, c.whatsapp,
       (c.verified_at is not null) as verified,
       c.confirmed_at, c.expires_at, c.published, c.created_by
from volunteer_call c
left join neighborhood n on n.id = c.neighborhood_id
where c.merged_into_id is null;

create view resource_offer_public with (security_invoker = on) as
select r.id, r.type, r.description, r.area,
       st_x(r.location::geometry) as longitude,
       st_y(r.location::geometry) as latitude,
       n.name as neighborhood,
       r.whatsapp,
       (r.verified_at is not null) as verified,
       r.confirmed_at, r.expires_at, r.published, r.created_by
from resource_offer r
left join neighborhood n on n.id = r.neighborhood_id;

create view work_order_public with (security_invoker = on) as
select w.id, w.category, w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name as neighborhood,
       w.status, w.attendee_count, w.exact_address,
       w.contact_name, w.phone, w.notes,
       (w.verified_at is not null) as verified,
       w.confirmed_at, w.expires_at, w.created_at, w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;

create view neighborhood_status_public with (security_invoker = on) as
select ns.id,
       ns.neighborhood_id,
       n.name as neighborhood,
       n.municipality,
       ns.evacuated,
       ns.gas_status,
       ns.power_status,
       ns.water_status,
       ns.notes,
       ns.confirmed_at,
       ns.expires_at
from neighborhood_status ns
join neighborhood n on n.id = ns.neighborhood_id;

create view neighborhood_need_public with (security_invoker = on) as
select nn.id,
       nn.neighborhood_id,
       n.name         as neighborhood,
       n.municipality,
       st_x(n.centroid::geometry) as longitude,
       st_y(n.centroid::geometry) as latitude,
       nn.category,
       nn.priority,
       nn.note,
       nn.confirmed_at,
       nn.expires_at
from neighborhood_need nn
join neighborhood n on n.id = nn.neighborhood_id
where n.centroid is not null;

create view animal_report_public with (security_invoker = on) as
select a.id, a.kind, a.species, a.pet_name, a.description, a.photo_path,
       a.last_seen_at,
       st_x(a.last_seen::geometry) as longitude,
       st_y(a.last_seen::geometry) as latitude,
       a.zone, a.whatsapp, a.resolved_at,
       (a.verified_at is not null) as verified,
       a.confirmed_at, a.expires_at, a.published, a.created_by
from animal_report a;
