-- "Yo puedo atender" — several people can attend the same necesidad, not
-- just one claimant. Mirrors call_attendance's shape and its trigger.
--
-- name and phone are NOT NULL here, unlike call_attendance's optional
-- whatsapp: a call's headcount is still useful anonymous, but showing up at
-- someone's damaged house needs to know who is actually coming.
--
-- This replaces the old single-claimant model, which required a signed-in
-- account specifically to become custodian of the contact info. The trade
-- this migration makes instead: work_order_contact is revealed once, in the
-- same response as attending, and every reveal is still logged (see
-- work_order_access below) — visibility that can be audited, the same
-- principle AGENTS.md already applies to a curator's own reads of this
-- table, just without the login wall in front of it.

create table work_order_attendance (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_order (id) on delete cascade,
  name          text not null,
  phone         text not null,
  created_at    timestamptz not null default now(),
  constraint work_order_attendance_phone_shape check (phone ~ '^\d{7,15}$')
);

create index work_order_attendance_order_idx on work_order_attendance (work_order_id);

alter table work_order_attendance enable row level security;

-- Writes go through the DAL with the service role, like every other table
-- here. No policy is granted to anon/authenticated: adding one would open a
-- second write path, and nothing needs to read this table directly either —
-- the public view projects only the count (see attendee_count below).

-- ------------------------------------------------------- attendee count ---
-- Denormalized on work_order because the panel reads it on every render,
-- mirroring volunteer_call.slots_taken and sync_call_slots.
alter table work_order add column attendee_count smallint not null default 0;

create or replace function sync_work_order_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
  total integer;
begin
  select count(*) into total
  from public.work_order_attendance
  where work_order_id = target_id;

  update public.work_order
     set attendee_count = total,
         -- The first attendee moves an untouched case into "claimed" — see
         -- workOrderRollup in lib/labels.ts, which still reads status the
         -- same way it always did. Never moves it back: fewer attendees
         -- than before is not the same claim as "nobody has this yet".
         status = case
                     when status = 'unclaimed' and total > 0 then 'claimed'
                     else status
                   end
   where id = target_id;

  return null;
end;
$fn$;

revoke execute on function sync_work_order_attendance() from public, anon, authenticated;

create trigger work_order_attendance_syncs_count
  after insert or delete on work_order_attendance
  for each row execute function sync_work_order_attendance();

-- ---------------------------------------------------------- old claim model
-- The single-claimant fields this replaces. `claimed_by` assumed exactly
-- one custodian of the contact info, gated behind a Google account; several
-- anonymous people can attend the same case now, so there is no one person
-- left for these columns to name, and no per-claim expiry to release.
--
-- The view and the policy both have to go first: Postgres will not drop a
-- column that a view or a policy still reads, even with `if exists` on the
-- column itself.

drop view if exists work_order_public;

-- work_order_contact_read_claimant checked claimed_by = auth.uid(), which is
-- about to stop existing. Nothing reads work_order_contact through the
-- RLS-bound client any more — the DAL always uses the service role for it,
-- on both the attend and the (future) curator path — so this is
-- curator-only now, kept for whenever an /admin surface reads it directly.
drop policy if exists work_order_contact_read_claimant on work_order_contact;

create policy work_order_contact_read_curator on work_order_contact
  for select using (is_curator());

drop function if exists release_stale_claims();

alter table work_order
  drop constraint if exists work_order_claim_is_complete,
  drop column if exists claimed_by,
  drop column if exists claimed_at,
  drop column if exists releases_at,
  -- Closing a case now starts its own clock: a resolved necesidad stays
  -- visible for a few hours (so whoever is already on the way still sees
  -- it, and so a wrong "cerrado" is easy to spot and correct) and then
  -- drops off the public map on its own, the same "labelled stale and
  -- demoted, never deleted" rule every other perishable table here follows.
  -- Null while the case is still open — there is nothing to expire yet.
  add column expires_at timestamptz;

create index work_order_live_idx on work_order (published, expires_at);

-- ------------------------------------------------------------------- view --
create view work_order_public with (security_invoker = on) as
select w.id,
       w.category,
       w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name                            as neighborhood,
       w.status,
       w.attendee_count,
       (w.verified_at is not null) as verified,
       w.confirmed_count,
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;

-- --------------------------------------------------------- access logging --
-- work_order_access used to name a signed-in profile only; an anonymous
-- attendee has none. profile_id keeps recording a curator's own reads (real
-- accounts, unchanged); attendee_id records an anonymous one instead.
alter table work_order_access
  alter column profile_id drop not null,
  add column attendee_id uuid references work_order_attendance (id) on delete set null,
  add constraint work_order_access_has_a_viewer
    check (profile_id is not null or attendee_id is not null);
