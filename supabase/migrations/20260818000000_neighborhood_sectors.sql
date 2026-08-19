-- Sectors: what Manizales actually says, hung on the barrio that has a shape.
--
-- `neighborhood` carries the 114 official barrio polygons and nothing below
-- them. Nobody on the ground talks at that resolution. A report written from
-- Villapilar says "Venecia" or "Aquilino Villegas"; a report from
-- Morrogacho says "Topacio", not "Morrogacho". Those are sectors — real,
-- named, and used — and until this migration they had no row anywhere, so
-- the barrio picker on the report forms could never offer them and every one
-- of those reports lands under the wrong, wider name.
--
-- The Alcaldía's own "nomenclatura" table (scripts/fetch-sectors.mjs) lists
-- 182 of them, each carrying the numeric code of the barrio it sits inside,
-- but the table has no geometry column at all — it is administrative
-- bookkeeping, not a GIS layer. There is no shape to add, so a sector cannot
-- become a 115th polygon the way a barrio can.
--
-- The decision: a sector is a `neighborhood` row like any other, addressable
-- by the same picker and resolvable to the same public view, but with
-- `boundary` left null and a new `parent_id` pointing at the barrio whose
-- polygon it falls inside of. It borrows that barrio's centroid so the form
-- still has somewhere honest to point the camera. `neighborhood_at()` only
-- ever consults `boundary`, so a sector can never become the barrio a pin
-- resolves to — the map, the panel filter and every count keep reading off
-- the 114 polygons exactly as before. A sector is discoverable, not
-- authoritative.

alter table neighborhood
  add column parent_id uuid references neighborhood (id) on delete cascade;

comment on column neighborhood.parent_id is
  'The polygon-bearing barrio this sector falls inside of. Null when the row '
  'IS a polygon-bearing barrio (or a legacy point with no known parent, e.g. '
  '"Villamaría centro" — see the backfill below). Never set on a barrio row.';

-- A sector exists precisely because we do not have its shape. The day a real
-- polygon for one turns up, it stops being a sector and becomes a barrio —
-- which means the row loses its parent, not gains a boundary alongside one.
-- A row that claims both would be lying about which kind of thing it is.
alter table neighborhood
  add constraint neighborhood_sector_has_no_boundary
  check (parent_id is null or boundary is null);

-- The join every lookup by parent takes: the picker grouping sectors under
-- their barrio, and the backfill below.
create index neighborhood_parent_id_idx on neighborhood (parent_id);

-- Same view as 20260814100000_neighborhood_public.sql, untouched except for
-- one column appended at the end — `create or replace view` only allows
-- adding columns after the existing ones, never inserting or reordering.
--
-- `parent` is the barrio's name, or null for a barrio row and for the one
-- legacy point ("Villamaría centro") with no known parent. A sector never
-- fails the `centroid is not null` filter below: it has no centroid of its
-- own, it was given its parent's at seed/insert time (scripts/fetch-sectors.mjs,
-- and the backfill at the bottom of this file), so the filter still only
-- drops rows nobody has ever placed anywhere.
create or replace view neighborhood_public with (security_invoker = on) as
select n.id,
       n.name,
       n.municipality,
       st_x(n.centroid::geometry) as longitude,
       st_y(n.centroid::geometry) as latitude,
       p.name as parent
from neighborhood n
left join neighborhood p on p.id = n.parent_id
where n.centroid is not null;

-- ------------------------------------------------------------ the backfill --
--
-- Four rows in `neighborhood` predate the SIG polygons entirely and carry a
-- hand-typed centroid with no boundary of their own: Avenida Santander, El
-- Cable and Los Naranjos (Manizales) and Villamaría centro. They are exactly
-- the shape a sector is — a centroid, no boundary — so they get a parent the
-- same way scripts/fetch-sectors.mjs would have given one, by asking which
-- barrio polygon their point falls inside of.
--
-- "Villamaría centro" is expected to come out with parent_id still null: we
-- hold no barrio polygons across the river, so `neighborhood_at()` correctly
-- finds nothing to attach it to. That is the honest answer, not a gap in this
-- backfill.
update neighborhood
set parent_id = neighborhood_at(st_x(centroid::geometry), st_y(centroid::geometry))
where boundary is null
  and name in ('Avenida Santander', 'El Cable', 'Los Naranjos', 'Villamaría centro');
