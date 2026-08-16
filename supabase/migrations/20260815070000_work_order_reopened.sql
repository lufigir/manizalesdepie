-- "Sigue haciendo falta" becomes visible from across the map.
--
-- The gap this closes: `sync_work_order_state` already computes a `reopened`
-- flag — somebody said the case is not done AFTER the last person said they
-- helped — and already lets it block a close. But it computes it into a local
-- variable and throws it away, so the status it writes for a contested case
-- is still `attended`, and `attended` draws GREEN.
--
-- Which means the one case on the map that most needs another pair of hands
-- — a neighbour went, it was not enough, and somebody stood there and said
-- so — is painted with the colour that says "somebody turned up". A reader
-- scanning for where to go today reads it as handled and moves on. That is
-- the opposite of what the entry meant.
--
-- Persisting the flag rather than deriving it in the app is deliberate: it
-- depends on the ORDER of two timestamps across the whole book, which the
-- public view does not project and should not have to. The derivation stays
-- in the one function that already owns it, exactly like `status` itself —
-- nothing in the application writes this column, the same guardrail
-- AGENTS.md states for status.
--
-- `status` is untouched. Adding a sixth value to `work_order_status` would
-- mean a case in this state stopped being `attended`, which it has not: two
-- people DID turn up, and the thread should keep saying so. This is a second
-- axis over the same status, not a replacement for it.

alter table work_order
  add column reopened boolean not null default false;

comment on column work_order.reopened is
  'Derived by sync_work_order_state: the last "sigue haciendo falta" came after the last "ya ayudé". Never written by the application.';

-- ------------------------------------------------------------- derivation --
-- Identical to `20260815050000_work_order_update_optional_contact`'s version
-- except for the one added assignment. `reopened` is already in scope there;
-- it only ever fed the `closed_completed` branch.
--
-- A closed_rejected case keeps its flag frozen along with its status, for the
-- same reason the counts freeze: a curator's verdict is not a tally, and the
-- card should keep reporting honestly what happened before the verdict.
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
  is_reopened       boolean;
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

  is_reopened := last_still_needed is not null
             and (last_helped is null or last_still_needed > last_helped);

  next_status := case
    when coalesce(helped_signed, 0) >= 2 and not is_reopened then 'closed_completed'
    when coalesce(helped, 0) >= 1                            then 'attended'
    when coalesce(going,  0) >= 1                            then 'claimed'
    else 'unclaimed'
  end;

  update public.work_order
     set attendee_count = coalesce(going, 0),
         helped_count   = coalesce(helped, 0),
         -- The only new line. A closed case is never "reopened": closing
         -- already required no complaint standing after the last help, and
         -- a later complaint moves the status itself back off closed.
         reopened       = is_reopened and next_status <> 'closed_completed',
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

-- ------------------------------------------------------------------ view --
-- Recreated to project the new column. Otherwise identical to the definition
-- in `20260815040000_drop_verification`, `security_invoker` included.
drop view if exists work_order_public;

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
       w.reopened,
       w.exact_address,
       w.contact_name,
       w.phone,
       w.notes,
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;
