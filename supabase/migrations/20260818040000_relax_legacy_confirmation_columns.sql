-- Let the application stop writing the legacy confirmation columns.
--
-- The expand migration kept `entity` and `entity_id` NOT NULL, so the data
-- layer had to keep filling them alongside the real `site_id`. That works, but
-- it couples the code to the contract migration: the moment
-- 20260818090000 drops those columns, any deployed build still writing them
-- starts failing every confirmation. A column drop would need a simultaneous
-- code deploy, which is the exact coupling expand-and-contract exists to
-- remove.
--
-- Relaxing the constraint here breaks that link. The code stops writing them
-- today, the columns sit inert carrying only their historical values, and the
-- contract migration drops two dead columns nothing references — no ordering
-- requirement against any deploy.
--
-- The `entity = 'site'` check goes with them: a check on a nullable column
-- nobody writes is a constraint guarding an empty set.

alter table site_confirmations alter column entity    drop not null;
alter table site_confirmations alter column entity_id drop not null;

alter table site_confirmations drop constraint if exists site_confirmations_entity_check;
