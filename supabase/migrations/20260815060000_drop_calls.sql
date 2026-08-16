-- Grupos are gone. The map is necesidades, and nothing else that moves.
--
-- The bet this reverses: that people would announce a cuadrilla here — "seis
-- de nosotros, escombros de la 24, sábado a las 7" — and that strangers
-- would find it and turn up. They do not, and the reason is not a missing
-- feature. Recruiting for a shift is a thing WhatsApp already does well, in
-- groups people already belong to, with notifications and identity we cannot
-- match. What this app was offering was a worse version of a solved problem.
--
-- Worse, a grupo is ephemeral in a way that fights everything else here. It
-- exists for one morning. By the afternoon the cuadrilla has moved, or gone
-- home, and the pin is a lie the map has no way to notice. Every other table
-- in this schema carries `confirmed_at` + `expires_at` precisely so that
-- staleness is visible; a grupo went stale faster than anyone could confirm
-- it.
--
-- What survives is the half that persists: `work_order`. "En esta esquina se
-- necesita remoción de escombros" stays true until somebody removes the
-- escombros, and it is checkable — you can stand in front of it and see. A
-- cuadrilla is not a thing to pin, it is a thing that HAPPENS to a case, and
-- that is already recorded: several people attend the same necesidad and
-- each leaves an entry in `work_order_update`. The grupo was a second,
-- weaker model of the same fact.
--
-- Nothing is migrated into work_order. A grupo carried a start time and a
-- meeting point, not a need — there is no honest way to read "somebody was
-- going to work here on Saturday" as "this is still needed today", and
-- guessing would put unverified pins on a map whose whole premise is that a
-- pin means something. The table is empty of anything but seed rows anyway
-- (`published = false`, never geocoded — see the seed warning in AGENTS.md).

-- ------------------------------------------------------------ the tables --
-- Order matters: the view reads the table, the attendance rows reference it,
-- and the trigger fires on it. `volunteer_call.merged_into_id` is a
-- self-reference, which the table drop takes with it.

drop view if exists volunteer_call_public;

drop trigger if exists volunteer_call_sets_neighborhood on volunteer_call;

-- The dupe-detection RPC `CALL_FORM.nearbyTitle` warned from — dead now with
-- the form and its DAL method (`data/call/call.dal.ts`) already gone.
drop function if exists find_nearby_calls(double precision, double precision, timestamptz, double precision, integer, integer);

-- `call_attendance` kept its RLS policy and its index; both go with the
-- table. Its `sync_call_slots` trigger and function were already dropped in
-- `20260815010000_minimize_forms`, when `slots_taken` stopped existing.
drop table if exists call_attendance;

drop table if exists volunteer_call;

-- ------------------------------------------------------------ the frentes --
-- `neighborhood_need.category` was declared `call_category` on the reasoning
-- that "a frente's category IS the kind of work a grupo does there". With no
-- grupos left, a frente is a barrio-level statement about NECESIDADES, so it
-- takes the enum the cases themselves use.
--
-- The table has never held a row (nothing in `seed.sql`, no write path in
-- the app — declarations go in by hand and no curator team exists yet), so
-- the conversion needs no mapping table and cannot lose anything. It is
-- written as drop-and-add rather than a `using` cast because the two enums
-- overlap on only one label and there is no row to preserve.
--
-- The view goes FIRST. `neighborhood_need_public` projects `category`, and
-- Postgres refuses to drop a column a view still reads — with `if exists` on
-- the column changing nothing, because the failure is the dependency, not the
-- column's absence. It is recreated at the bottom, after the swap.
drop view if exists neighborhood_need_public;

-- The unique constraint is on (neighborhood_id, category), so it has to be
-- rebuilt around the new column.
alter table neighborhood_need
  drop constraint neighborhood_need_neighborhood_id_category_key;

alter table neighborhood_need drop column category;

alter table neighborhood_need
  add column category work_order_category not null default 'other';

alter table neighborhood_need alter column category drop default;

alter table neighborhood_need
  add constraint neighborhood_need_neighborhood_id_category_key
  unique (neighborhood_id, category);

-- Recreated now that the swap is done. Identical to
-- `20260814140000_neighborhood_need`'s definition otherwise, `security_invoker`
-- included — without it the view would bypass RLS.
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
       nn.source,
       nn.confirmed_at,
       nn.expires_at
from neighborhood_need nn
join neighborhood n on n.id = nn.neighborhood_id
where n.centroid is not null;

-- -------------------------------------------------------------- the enum --
-- Last, once nothing refers to it. Postgres refuses the drop if anything
-- still does, which is the check that this migration did not miss a column.
drop type if exists call_category;
