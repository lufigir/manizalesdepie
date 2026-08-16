-- A necesidad no longer closes itself. It cools.
--
-- What this replaces: two "ya ayudé" from two distinct phones, with no
-- "sigue haciendo falta" standing after them, wrote `closed_completed` and
-- started a six-hour expiry. That threshold was built to answer "who gets to
-- decide a case is over" — one anonymous tap could not be trusted, so it took
-- two. It answered that question well and asked a worse one, because the
-- premise underneath it is false: help arriving is not the same event as a
-- household no longer needing help.
--
-- Two neighbours clearing what they could carry is two real entries in the
-- book and a family still living around what is left. The old rule read that
-- as finished and took the pin off the map six hours later, and the only way
-- back was for somebody to find a case they could no longer see.
--
-- So the tally stops writing a terminal status entirely. What it writes now
-- is how much attention the case has had:
--
--   nothing yet ............................ unclaimed
--   ≥1 "voy" ............................... claimed
--   ≥1 "ya ayudé" .......................... attended
--   ≥2 "ya ayudé", distinct phones ......... attended, drawn green
--
-- The last line is a colour, not a status: `workOrderRollup` reads
-- `helped_count` and paints a well-attended case with the resolved hue, so it
-- stops competing for attention with a case nobody has been to. It is still
-- open, still listed, still contactable. "Sigue haciendo falta" still
-- outranks every help before it and puts the case back to full red.
--
-- Closing stays, and stays a curator's: `closed_completed` when the household
-- says it is over, `closed_rejected` when the case was never real. Both are
-- statements somebody is accountable for, which is the property the tally
-- never had. Without them the map only ever grows, spam included.
--
-- The cost, stated rather than hidden: a genuinely finished case sits green
-- on the map until a curator closes it. A stale green pin costs a phone call;
-- a pin deleted while a family still needs it costs them the people who were
-- coming.

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
  is_reopened       boolean;
  current_status    public.work_order_status;
  next_status       public.work_order_status;
begin
  -- `helped_signed` is gone with the threshold it existed for: counting
  -- distinct phones only ever mattered because the second one closed the
  -- case. Nothing turns on distinctness now, and `helped_count` was always
  -- the plain count.
  select count(*) filter (where kind = 'on_the_way'),
         count(*) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'helped'),
         max(created_at) filter (where kind = 'still_needed')
    into going, helped, last_helped, last_still_needed
  from public.work_order_update
  where work_order_id = target_id;

  select status into current_status
  from public.work_order where id = target_id;

  -- A curator's verdict is not a tally and no number of entries overturns
  -- it. Both closed states are frozen here now, not just the rejection: with
  -- the automatic close gone, `closed_completed` is only ever a curator's
  -- decision too, and an entry arriving afterwards must not silently undo
  -- it. The counts still move, so the card keeps reporting honestly who
  -- turned up.
  if current_status in ('closed_rejected', 'closed_completed', 'closed_by_others') then
    update public.work_order
       set attendee_count = coalesce(going, 0),
           helped_count   = coalesce(helped, 0)
     where id = target_id;
    return null;
  end if;

  is_reopened := last_still_needed is not null
             and (last_helped is null or last_still_needed > last_helped);

  -- No `closed_completed` branch. This is the whole change.
  next_status := case
    when coalesce(helped, 0) >= 1 then 'attended'
    when coalesce(going,  0) >= 1 then 'claimed'
    else 'unclaimed'
  end;

  update public.work_order
     set attendee_count = coalesce(going, 0),
         helped_count   = coalesce(helped, 0),
         reopened       = is_reopened,
         status         = next_status,
         confirmed_at   = now(),
         -- Both null, unconditionally. An open case has no closing time and
         -- no expiry, and every case this function touches is now open.
         closed_at      = null,
         expires_at     = null
   where id = target_id;

  return null;
end;
$fn$;

revoke execute on function sync_work_order_state() from public, anon, authenticated;

-- --------------------------------------------------------- the backlog ----
--
-- Cases the old rule closed on its own are reopened. They were never closed
-- by a person, so there is nobody whose decision this overrules — and every
-- one of them is a household that may still be waiting.
--
-- A curator's own closes are left exactly as they are: `closed_at` is what
-- separates the two, since the tally set it at the same moment it set the
-- status and a curator's close goes through `closeWorkOrder`, which also
-- stamps it. Neither is distinguishable after the fact, so this errs toward
-- putting cases back ON the map. A curator can close them again in one tap;
-- a family cannot un-hide themselves.

update work_order
set status     = case when helped_count >= 1 then 'attended'::work_order_status
                      when attendee_count >= 1 then 'claimed'::work_order_status
                      else 'unclaimed'::work_order_status
                 end,
    closed_at  = null,
    expires_at = null
where status = 'closed_completed';
