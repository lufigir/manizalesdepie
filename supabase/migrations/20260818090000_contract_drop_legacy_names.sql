-- Contract phase for 20260818030000_expand_plural_names.sql.
--
-- DO NOT APPLY until no deployed code references any of the old names below
-- (site, profile, neighborhood, animal_report, site_item, work_order,
-- work_order_update, resource_offer, need, need_update, service,
-- confirmation, and every *_public view under an old name). Deploy the
-- plural-named client first, confirm it in production, then run this file
-- as its own migration.
--
-- It also drops the redundant needs.state column and drops the
-- entity/entity_id columns on site_confirmations now that site_id has been
-- carrying the real relationship since the expand migration.

drop view if exists site_public;
drop view if exists neighborhood_public;
drop view if exists animal_report_public;
drop view if exists need_public;
drop view if exists need_update_public;
drop view if exists service_public;
drop view if exists work_order_public;
drop view if exists work_order_update_public;
drop view if exists resource_offer_public;

drop view if exists site;
drop view if exists profile;
drop view if exists neighborhood;
drop view if exists animal_report;
drop view if exists site_item;
drop view if exists need;
drop view if exists need_update;
drop view if exists service;
drop view if exists work_order;
drop view if exists work_order_update;
drop view if exists resource_offer;
drop view if exists confirmation;

-- `state` was added by the expand migration to carry a new enum alongside the
-- old one, per the rule that an ALTER TYPE is a rename and gets the
-- add-backfill-switch-drop treatment. That safety never applied here: the
-- in-place enum swap had already run in 20260818020000, before the rule was
-- adopted, so `state` was born a byte-for-byte duplicate of `status` — same
-- `need_status` type, same values, nothing to dual-write against.
--
-- So this drops the duplicate rather than dropping the column that holds the
-- data and renaming a copy over it. Both end with one `status` column of type
-- need_status; only this one avoids destroying the original to get there.
alter table needs drop column state;

-- sync_need_state stops writing the now-gone `state` alias.
create or replace function sync_need_state()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_id         uuid := coalesce(new.need_id, old.need_id);
  going             integer;
  helped            integer;
  last_helped       timestamptz;
  last_still_needed timestamptz;
  is_reopened       boolean;
  current_status    public.need_status;
  next_status       public.need_status;
begin
  select count(*) filter (where kind = 'on_the_way'),
         count(*) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'still_needed')
    into going, helped, last_helped, last_still_needed
  from public.need_updates
  where need_id = target_id;

  select status into current_status
  from public.needs where id = target_id;

  if current_status in ('closed_rejected', 'closed_completed') then
    update public.needs
       set on_the_way_count = coalesce(going, 0),
           helped_count     = coalesce(helped, 0)
     where id = target_id;
    return null;
  end if;

  is_reopened := last_still_needed is not null
             and (last_helped is null or last_still_needed > last_helped);

  next_status := case
    when coalesce(helped, 0) >= 1 then 'attended'
    when coalesce(going,  0) >= 1 then 'on_the_way'
    else 'pending'
  end;

  update public.needs
     set on_the_way_count = coalesce(going, 0),
         helped_count     = coalesce(helped, 0),
         reopened         = is_reopened,
         status           = next_status,
         confirmed_at     = now(),
         closed_at        = null,
         expires_at       = null
   where id = target_id;

  return null;
end;
$function$;

-- site_confirmations: site_id has been the real, validated relationship
-- since the expand migration; entity/entity_id are dead weight now.
--
-- One row (527684cf-c6ce-4d82-bfb2-346143ee6949) carries site_id = null: it
-- confirmed a site that had already been deleted, which the old table allowed
-- because entity_id was never a foreign key. That is the exact drift the FK
-- exists to stop. It has to go before site_id can be NOT NULL, and it is not
-- worth keeping — a confirmation of a row nobody can look up says nothing.
-- Deleted explicitly rather than left for `set not null` to fail on.
delete from site_confirmations where site_id is null;

alter table site_confirmations drop column entity;
alter table site_confirmations drop column entity_id;
alter table site_confirmations alter column site_id set not null;

drop type if exists confirmable_entity;

-- Deferred from the original request (still pending, not part of this
-- expand/contract pass, listed here only so they are not forgotten):
--   - site.merged_into_id, profile.whatsapp: already dropped directly in
--     20260818010000, before expand/contract was required. No action here.
--   - site_type losing vet_clinic/water_point: same — already contracted
--     in 20260818010000.
