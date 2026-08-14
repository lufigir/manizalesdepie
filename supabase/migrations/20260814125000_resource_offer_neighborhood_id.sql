-- Pre-existing bug, found while building resource_offer_public: the barrio
-- migration (20260814080000) created `resource_offer_sets_neighborhood` and
-- pointed it at a `neighborhood_id` column that was never added to
-- `resource_offer` — every other table the trigger serves (site,
-- volunteer_call, work_order) got the column in the init migration, this one
-- shipped after and was missed. Not silent: any insert or update touching
-- `location` would hard-fail with "column neighborhood_id does not exist".
-- It never surfaced because nothing had written to the table yet — the whole
-- point of this session's work is to give it its first writer.
alter table resource_offer
  add column neighborhood_id uuid references neighborhood (id) on delete set null;

create index resource_offer_neighborhood_idx on resource_offer (neighborhood_id);
