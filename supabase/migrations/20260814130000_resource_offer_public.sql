-- Servicios: resource_offer gets a public view and its missing enum value,
-- the two things `data/resource_offer/` needs to exist at all.

-- ALTER TYPE ... ADD VALUE needs its own migration, isolated from anything
-- that might use the new value in the same transaction (see AGENTS.md §6).
alter type resource_type add value 'home_stay';

-- Same trick as site_public: security_invoker = on so RLS still applies,
-- longitude/latitude projected out of the geography column because
-- PostGREST would otherwise hand back WKB hex. `location` is nullable here
-- (unlike a site) — an offer like "tengo una volqueta" is not anchored to
-- one exact point the way a collection point is, so both columns may be
-- null and the row is still worth showing, keyed by `area` and the barrio
-- alone.
create view resource_offer_public with (security_invoker = on) as
select r.id, r.type, r.description, r.quantity, r.area,
       st_x(r.location::geometry) as longitude,
       st_y(r.location::geometry) as latitude,
       n.name as neighborhood,
       r.whatsapp, r.available_from, r.available_until,
       (r.verified_at is not null) as verified,
       r.confirmed_count,
       r.confirmed_at, r.expires_at, r.published, r.created_by
from resource_offer r
left join neighborhood n on n.id = r.neighborhood_id;
