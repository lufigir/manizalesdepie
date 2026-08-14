-- Los barrios, legibles desde el formulario.
--
-- The report forms stopped asking people to find a spot on a map of the whole
-- city — which is the hard part when you are standing on a street with one bar
-- of signal — and now ask for the barrio first. The map then opens already
-- framed on it, so what is left is adjusting metres instead of kilometres.
--
-- For that the browser needs the barrio's coordinate, and `centroid` is a
-- PostGIS geography that PostgREST would serialise as WKB hex. Same projection
-- trick as site_public, and the same reason: the client should never have to
-- decode geometry.
--
-- security_invoker = on for the same reason as every other view here. The
-- policy it defers to is `neighborhood_read_all` — reference data is public,
-- which is why this view carries no filter of its own.
--
-- Rows with no centroid are dropped rather than returned with nulls: a barrio
-- the map cannot fly to is not an option the picker can offer. All 118 have one
-- today; the filter is what keeps that from becoming an assumption.
create view neighborhood_public with (security_invoker = on) as
select n.id,
       n.name,
       n.municipality,
       st_x(n.centroid::geometry) as longitude,
       st_y(n.centroid::geometry) as latitude
from neighborhood n
where n.centroid is not null;
