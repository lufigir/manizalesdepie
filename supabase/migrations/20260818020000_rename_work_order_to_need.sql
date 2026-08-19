-- Crisis Cleanup vocabulary, with nothing left standing on it: no claims, no
-- releases, the route is /necesidad. This migration is a rename, not a
-- redesign — every column that changes name keeps its meaning, and
-- sync_work_order_state's derivation logic (bitácora -> status, "sigue
-- haciendo falta" outranks any earlier help, closed states frozen) is
-- ported unchanged into sync_need_state.
--
-- approx_location -> location: the address has been public since 15 August,
-- so "approx" describes a model that no longer exists.
-- attendee_count -> on_the_way_count: it always counted "voy", never
-- attendance.
-- reported_by -> created_by: matches site/animal_report/service/confirmation.
-- work_order_status -> need_status is recreated rather than relabeled:
-- unclaimed -> pending, claimed -> on_the_way, closed_by_others dropped
-- (0 rows), the rest keep their names.
-- resource_offer -> service, keeping every resource_type value: those are
-- form options, not code paths.

drop view work_order_public;
drop view work_order_update_public;
drop view resource_offer_public;

drop trigger work_order_update_syncs_state on work_order_update;
drop function sync_work_order_state();

alter table work_order rename to need;
alter table work_order_update rename to need_update;

alter table need_update rename column work_order_id to need_id;

alter table need rename column approx_location to location;
alter table need rename column attendee_count to on_the_way_count;
alter table need rename column reported_by to created_by;

alter table need drop constraint work_order_not_merged_into_itself;
alter table need drop column merged_into_id;

alter table need rename constraint work_order_pkey to need_pkey;
alter table need rename constraint work_order_neighborhood_id_fkey to need_neighborhood_id_fkey;
alter table need rename constraint work_order_reported_by_fkey to need_created_by_fkey;
alter table need rename constraint work_order_phone_shape to need_phone_shape;

alter table need_update rename constraint work_order_attendance_pkey to need_update_pkey;
alter table need_update rename constraint work_order_attendance_work_order_id_fkey to need_update_need_id_fkey;
alter table need_update rename constraint work_order_update_note_length to need_update_note_length;
alter table need_update rename constraint work_order_update_phone_shape to need_update_phone_shape;

alter index work_order_live_idx rename to need_live_idx;
alter index work_order_location_idx rename to need_location_idx;
alter index work_order_update_kind_idx rename to need_update_kind_idx;
alter index work_order_update_order_idx rename to need_update_order_idx;

alter type work_order_category rename to need_category;
alter type work_order_update_kind rename to need_update_kind;

alter table need alter column status drop default;

create type need_status_new as enum (
  'pending',
  'on_the_way',
  'attended',
  'closed_completed',
  'closed_rejected'
);

alter table need
  alter column status type need_status_new
  using (
    case status::text
      when 'unclaimed' then 'pending'
      when 'claimed' then 'on_the_way'
      else status::text
    end
  )::need_status_new;

drop type work_order_status;
alter type need_status_new rename to need_status;

alter table need alter column status set default 'pending'::need_status;

drop trigger work_order_sets_neighborhood on need;
create trigger need_sets_neighborhood
  before insert or update on need
  for each row execute function set_neighborhood_from_location('location');

alter table resource_offer rename to service;
alter table service rename constraint resource_offer_pkey to service_pkey;
alter table service rename constraint resource_offer_created_by_fkey to service_created_by_fkey;
alter table service rename constraint resource_offer_neighborhood_id_fkey to service_neighborhood_id_fkey;

alter index resource_offer_live_idx rename to service_live_idx;
alter index resource_offer_location_idx rename to service_location_idx;
alter index resource_offer_neighborhood_idx rename to service_neighborhood_idx;

alter type resource_type rename to service_type;

alter trigger resource_offer_sets_neighborhood on service rename to service_sets_neighborhood;

create function sync_need_state()
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
  from public.need_update
  where need_id = target_id;

  select status into current_status
  from public.need where id = target_id;

  if current_status in ('closed_rejected', 'closed_completed') then
    update public.need
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

  update public.need
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

create trigger need_update_syncs_state
  after insert or delete on need_update
  for each row execute function sync_need_state();

alter policy work_order_read_published on need rename to need_read_published;
alter policy work_order_update_read_public on need_update rename to need_update_read_public;
alter policy resource_offer_read_published on service rename to service_read_published;

create view need_public with (security_invoker = on) as
select w.id,
       w.category,
       w.description,
       st_x(w.location::geometry) as longitude,
       st_y(w.location::geometry) as latitude,
       n.name                     as neighborhood,
       w.status,
       w.on_the_way_count,
       w.helped_count,
       w.reopened,
       w.exact_address,
       w.contact_name,
       w.phone,
       w.notes,
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from need w
left join neighborhood n on n.id = w.neighborhood_id;

create view need_update_public with (security_invoker = on) as
select id,
       need_id,
       kind,
       name,
       phone,
       note,
       created_at
from need_update u;

create view service_public with (security_invoker = on) as
select r.id, r.type, r.description, r.area,
       st_x(r.location::geometry) as longitude,
       st_y(r.location::geometry) as latitude,
       n.name as neighborhood,
       r.whatsapp,
       r.confirmed_at, r.expires_at, r.published, r.created_by
from service r
left join neighborhood n on n.id = r.neighborhood_id;

grant select on need_public to anon, authenticated;
grant select on need_update_public to anon, authenticated;
grant select on service_public to anon, authenticated;

-- updated_at, using touch_updated_at() from the previous migration: need's
-- status is derived and reopened by the bitácora, and both need and service
-- can have their pin relocated, so both need a stamp of "something changed"
-- distinct from confirmed_at ("someone vouched this is still true").

alter table need add column updated_at timestamptz not null default now();

create trigger need_touches_updated_at
  before update on need
  for each row execute function touch_updated_at();

alter table service add column updated_at timestamptz not null default now();

create trigger service_touches_updated_at
  before update on service
  for each row execute function touch_updated_at();
