-- Nobody closes a case any more. The case closes itself, or it does not.
--
-- The flaw this fixes: `canCloseWorkOrder()` returned true unconditionally,
-- so one anonymous tap wrote a terminal status and started the six-hour
-- clock. A single bad actor could take any case off the map, and the worst
-- of the three outcomes was `closed_rejected` — "no es un caso real" — which
-- let "this case annoys me" be recorded as "this was a lie", about a
-- household with no way to find out.
--
-- What replaces it: `work_order_attendance` becomes `work_order_update`, an
-- append-only book where each entry says what somebody DID or SAW, signed
-- with a name and a phone. `status` stops being something anyone writes and
-- becomes something read out of that book by `sync_work_order_state`:
--
--   nothing yet .................... unclaimed
--   ≥1 "voy" ....................... claimed
--   ≥1 "ya ayudé" .................. attended, and still open to more hands
--   ≥2 "ya ayudé", distinct phones,
--   with no "sigue haciendo falta"
--   after the last of them ......... closed_completed
--
-- Two, from two different phones, because one person saying a case is over
-- is the exact claim that could not be trusted before. "Sigue haciendo
-- falta" is the counterweight: it outranks any number of "ya ayudé" that
-- came before it and puts the case back on the map, so the mechanism that
-- closes is also the mechanism that undoes a wrong close — without needing
-- anybody's permission, and without a moderator in the loop.
--
-- `not_real` deliberately moves nothing. Reporting that a case is fake is
-- open to anyone; acting on it is a curator's call, because it is the one
-- verdict that calls somebody a liar.
--
-- The cost, stated rather than hidden: a real case that only one person ever
-- helps with sits at "attended" until a curator closes it. A case too many
-- on the map costs a phone call. A case closed by one stranger costs a
-- family the people who were coming.

-- ------------------------------------------------------------- the book --

alter table work_order_attendance rename to work_order_update;

alter index work_order_attendance_order_idx rename to work_order_update_order_idx;

alter table work_order_update
  rename constraint work_order_attendance_phone_shape to work_order_update_phone_shape;

alter table work_order_update
  rename constraint work_order_attendance_note_length to work_order_update_note_length;

alter policy work_order_attendance_read_public on work_order_update
  rename to work_order_update_read_public;

-- Every existing row was a "yo puedo atender": it is the only thing the table
-- could hold. Defaulted for the backfill, then dropped, so nothing can write
-- an entry without saying which kind it is.
alter table work_order_update
  add column kind work_order_update_kind not null default 'on_the_way';

alter table work_order_update alter column kind drop default;

create index work_order_update_kind_idx
  on work_order_update (work_order_id, kind);

-- Counted separately from `attendee_count` because they answer different
-- questions — "¿cuántos van?" and "¿cuántos ya fueron?" — and the card shows
-- both. Denormalized for the same reason as attendee_count: the panel reads
-- them on every render.
alter table work_order add column helped_count smallint not null default 0;

-- ------------------------------------------------------ derived status ---

drop trigger work_order_attendance_syncs_count on work_order_update;
drop function sync_work_order_attendance();

create or replace function sync_work_order_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  target_id         uuid := coalesce(new.work_order_id, old.work_order_id);
  going             integer;
  helped            integer;
  last_helped       timestamptz;
  last_still_needed timestamptz;
  reopened          boolean;
  current_status    public.work_order_status;
  next_status       public.work_order_status;
begin
  -- Distinct phone, not row count: two entries from one number are one
  -- person saying it twice, and the whole threshold rests on the second
  -- "ya ayudé" coming from somebody else.
  select count(distinct phone) filter (where kind = 'on_the_way'),
         count(distinct phone) filter (where kind = 'helped'),
         max(created_at)       filter (where kind = 'helped'),
         max(created_at)       filter (where kind = 'still_needed')
    into going, helped, last_helped, last_still_needed
  from public.work_order_update
  where work_order_id = target_id;

  select status into current_status
  from public.work_order where id = target_id;

  -- A curator's rejection is a verdict, not a tally, and no number of
  -- entries may overturn it. The counts still move so the card stays honest
  -- about who turned up before it was rejected.
  if current_status = 'closed_rejected' then
    update public.work_order
       set attendee_count = coalesce(going, 0),
           helped_count   = coalesce(helped, 0)
     where id = target_id;
    return null;
  end if;

  -- "Sigue haciendo falta" only counts against the helps that came BEFORE
  -- it. Someone helping after the complaint is the case moving forward
  -- again, not a dispute.
  reopened := last_still_needed is not null
          and (last_helped is null or last_still_needed > last_helped);

  next_status := case
    when coalesce(helped, 0) >= 2 and not reopened then 'closed_completed'
    when coalesce(helped, 0) >= 1                  then 'attended'
    when coalesce(going,  0) >= 1                  then 'claimed'
    else 'unclaimed'
  end;

  update public.work_order
     set attendee_count = coalesce(going, 0),
         helped_count   = coalesce(helped, 0),
         status         = next_status,
         -- Somebody just stood in front of this and said something about it,
         -- which is exactly what confirmed_at means everywhere else here.
         confirmed_at   = now(),
         closed_at = case
                       when next_status = 'closed_completed' then coalesce(closed_at, now())
                       else null
                     end,
         -- Six hours of afterlife on a closed case: long enough that someone
         -- already on the way still sees it, short enough that the map does
         -- not fill with resolved cases. Null puts it back to "no expiry",
         -- which is what an open case has always been.
         expires_at = case
                       when next_status = 'closed_completed' then now() + interval '6 hours'
                       else null
                     end
   where id = target_id;

  return null;
end;
$fn$;

revoke execute on function sync_work_order_state() from public, anon, authenticated;

create trigger work_order_update_syncs_state
  after insert or delete on work_order_update
  for each row execute function sync_work_order_state();

-- ------------------------------------------------------------------ views --

drop view work_order_attendance_public;
drop view work_order_public;

create view work_order_update_public with (security_invoker = on) as
select u.id,
       u.work_order_id,
       u.kind,
       u.name,
       u.phone,
       u.note,
       u.created_at
from work_order_update u;

create view work_order_public with (security_invoker = on) as
select w.id,
       w.category,
       w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name                            as neighborhood,
       w.status,
       w.attendee_count,
       w.helped_count,
       w.exact_address,
       w.contact_name,
       w.phone,
       w.notes,
       (w.verified_at is not null) as verified,
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;
