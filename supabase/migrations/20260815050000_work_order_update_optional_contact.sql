-- The note is the one thing an entry must carry. Name and phone become
-- optional, so someone who saw a case get worked on and wants to say so
-- is not turned away at the door for not wanting to leave a number.
--
-- Table is empty as of this migration (checked before writing it), so both
-- directions — relaxing NOT NULL, tightening the note check — are safe with
-- no backfill.
--
-- Colombia only, no country code: every phone field in this app has asked
-- for "indicativo del país" in its error copy while actually accepting a
-- bare 10-digit mobile number (the placeholder everywhere is "3001234567").
-- This one stops saying the wrong thing and requires exactly the 10 digits
-- Colombia uses.

alter table work_order_update alter column name drop not null;
alter table work_order_update alter column phone drop not null;

alter table work_order_update drop constraint work_order_update_phone_shape;
alter table work_order_update add constraint work_order_update_phone_shape
  check (phone is null or phone ~ '^\d{10}$');

alter table work_order_update drop constraint work_order_update_note_length;
alter table work_order_update add constraint work_order_update_note_length
  check (note is not null and length(btrim(note)) >= 3 and length(note) <= 500);

-- ------------------------------------------------------------ derivation --
-- Two things change here, and only one of them touches the safety property
-- AGENTS.md documents.
--
-- Display counts (`attendee_count`, `helped_count`) become raw row counts
-- rather than distinct-phone counts: an anonymous "ya ayudé" is still a real
-- person saying so, and belongs in "3 personas ayudaron" same as a signed
-- one. Deduping by phone only ever mattered for the count that decides
-- whether a case closes, which is the second thing.
--
-- Closing still needs two DISTINCT, NAMED phone numbers. An anonymous entry
-- can carry a case to "attended" — it is evidence, and it shows in the
-- thread — but it can never by itself be one of the two votes that close it,
-- because nothing distinguishes one anonymous "ya ayudé" from the same
-- person tapping twice. The guarantee in AGENTS.md ("no single person closes
-- a work_order") holds exactly as before.
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
  helped_signed     integer;
  last_helped       timestamptz;
  last_still_needed timestamptz;
  reopened          boolean;
  current_status    public.work_order_status;
  next_status       public.work_order_status;
begin
  select count(*) filter (where kind = 'on_the_way'),
         count(*) filter (where kind = 'helped'),
         count(distinct phone) filter (where kind = 'helped' and phone is not null),
         max(created_at) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'still_needed')
    into going, helped, helped_signed, last_helped, last_still_needed
  from public.work_order_update
  where work_order_id = target_id;

  select status into current_status
  from public.work_order where id = target_id;

  if current_status = 'closed_rejected' then
    update public.work_order
       set attendee_count = coalesce(going, 0),
           helped_count   = coalesce(helped, 0)
     where id = target_id;
    return null;
  end if;

  reopened := last_still_needed is not null
          and (last_helped is null or last_still_needed > last_helped);

  next_status := case
    when coalesce(helped_signed, 0) >= 2 and not reopened then 'closed_completed'
    when coalesce(helped, 0) >= 1                         then 'attended'
    when coalesce(going,  0) >= 1                          then 'claimed'
    else 'unclaimed'
  end;

  update public.work_order
     set attendee_count = coalesce(going, 0),
         helped_count   = coalesce(helped, 0),
         status         = next_status,
         confirmed_at   = now(),
         closed_at = case
                       when next_status = 'closed_completed' then coalesce(closed_at, now())
                       else null
                     end,
         expires_at = case
                       when next_status = 'closed_completed' then now() + interval '6 hours'
                       else null
                     end
   where id = target_id;

  return null;
end;
$fn$;
