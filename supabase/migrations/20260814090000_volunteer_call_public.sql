-- Convocatorias, readable.
--
-- The table has existed since the initial schema; what was missing is the two
-- things every other entity here has and it did not: a view that projects the
-- PostGIS point as longitude/latitude, and a duplicate lookup.
--
-- Duplicate detection for a call is NOT the same problem as for a site. Two
-- pins at the same coliseum are the same coliseum whenever they are reported;
-- two shifts at the same park are the same shift only if they are also at the
-- same hour. Saturday's brigade and Sunday's brigade in the same block are two
-- real things, and merging them would send people on the wrong day. So the
-- lookup takes a time window as well as a radius, and both have to match.

-- ------------------------------------------------------------------- view --
-- security_invoker = on is load-bearing, exactly as in site_public: without it
-- the view runs as its owner and bypasses volunteer_call_read_published.
--
-- Every column here is already public by that policy. The phone number is the
-- organiser's own, published so that someone can ask "¿todavía hace falta
-- gente?" before crossing the city — it is not a third party's. The volunteers'
-- numbers live in call_attendance and never appear in a view.
create view volunteer_call_public with (security_invoker = on) as
select c.id,
       c.title,
       c.category,
       c.description,
       st_x(c.meeting_point::geometry) as longitude,
       st_y(c.meeting_point::geometry) as latitude,
       c.meeting_address,
       n.name as neighborhood,
       c.starts_at,
       c.ends_at,
       c.slots_total,
       c.slots_taken,
       c.bring,
       c.whatsapp,
       (c.verified_at is not null) as verified,
       c.confirmed_count,
       c.confirmed_at,
       c.expires_at,
       c.published,
       c.created_by
from volunteer_call c
left join neighborhood n on n.id = c.neighborhood_id
where c.merged_into_id is null;

-- -------------------------------------------------------------- duplicates --
-- search_path is 'extensions', not '', for the same reason as find_nearby_sites:
-- PostGIS lives there and the geography cast cannot be schema-qualified inline.
--
-- The window is symmetric around the new call's start time. Someone convening
-- "mañana a las 8" when a brigade already meets at 9 in the same park is almost
-- certainly talking about that brigade, and the answer is to join it rather
-- than to split the ten neighbours with shovels into two groups of five.
create or replace function find_nearby_calls(
  lng          double precision,
  lat          double precision,
  at           timestamptz,
  radius_m     double precision default 150,
  window_hours integer          default 3,
  max_results  integer          default 5
)
returns table (
  id         uuid,
  title      text,
  category   call_category,
  starts_at  timestamptz,
  distance_m double precision
)
language sql
stable
set search_path = extensions, pg_temp
as $$
  select c.id,
         c.title,
         c.category,
         c.starts_at,
         st_distance(c.meeting_point, st_point(lng, lat)::geography) as distance_m
  from public.volunteer_call c
  where c.merged_into_id is null
    and c.published
    and st_dwithin(c.meeting_point, st_point(lng, lat)::geography, radius_m)
    and c.starts_at between at - make_interval(hours => window_hours)
                        and at + make_interval(hours => window_hours)
  order by c.meeting_point <-> st_point(lng, lat)::geography
  limit max_results;
$$;
