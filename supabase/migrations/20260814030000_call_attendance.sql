-- "Quiero participar".
--
-- The shared link is the product's entry point — the most repeated line in the
-- city's relief WhatsApp groups is "¿por dónde queda exactamente?" — and this
-- is what someone does once the link answers it.
--
-- Signing up takes one optional field. The documented pattern from disaster
-- platforms is that the phone number IS the identity: spontaneous volunteers
-- will not create an account, and a signup that takes longer than a minute
-- loses them. Leaving it blank is allowed; that person is a headcount, not a
-- contact, and the organiser cannot warn them if the shift is called off.
--
-- Creating a call, unlike everything else in this app, does require an account.
-- It is the only action that makes someone the custodian of other people's
-- phone numbers, and a custodian has to be someone.

create table call_attendance (
  id                uuid primary key default gen_random_uuid(),
  volunteer_call_id uuid        not null references volunteer_call (id) on delete cascade,
  -- Set when the volunteer happened to be signed in. Usually null.
  profile_id        uuid references profile (id) on delete set null,
  -- Optional on purpose. Digits with country code, same shape as everywhere.
  whatsapp          text,
  -- Tapped during curfew hours (22:00–05:00), when "come now" is not a thing
  -- anyone may act on. The organiser needs to see who meant tomorrow.
  for_tomorrow      boolean     not null default false,
  created_at        timestamptz not null default now(),
  constraint call_attendance_whatsapp_shape
    check (whatsapp is null or whatsapp ~ '^\d{10,15}$')
);

create index call_attendance_call_idx on call_attendance (volunteer_call_id);

-- One signup per signed-in person per call. Anonymous ones are not deduplicated
-- because there is nothing to deduplicate them by, and inflating a headcount is
-- a far smaller harm than blocking a real volunteer.
create unique index call_attendance_one_per_profile
  on call_attendance (volunteer_call_id, profile_id)
  where profile_id is not null;

alter table call_attendance enable row level security;

-- The sensitive half. A phone number here belongs to a volunteer, and the map
-- is public during a looting curfew, so it is readable only by the person who
-- called the shift and by curators. The public sees a count, never a list.
create policy call_attendance_read_organiser on call_attendance
  for select using (
    is_curator()
    or exists (
      select 1 from volunteer_call c
      where c.id = volunteer_call_id
        and c.created_by = (select auth.uid())
    )
  );

-- Writes go through the DAL with the service role, as everywhere else. No
-- insert policy is granted here: adding one would open a second write path.

-- slots_taken is denormalized on volunteer_call because the map reads it on
-- every render, and it rides the realtime channel. Maintained by trigger so it
-- cannot drift from the rows it counts.
create or replace function sync_call_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  update public.volunteer_call c
     set slots_taken = (
           select count(*) from public.call_attendance a
            where a.volunteer_call_id = c.id
         )
   where c.id = coalesce(new.volunteer_call_id, old.volunteer_call_id);
  return null;
end;
$fn$;

revoke execute on function sync_call_slots() from public, anon, authenticated;

create trigger call_attendance_syncs_slots
  after insert or delete on call_attendance
  for each row execute function sync_call_slots();
