-- A necesidad publishes its contact details, and its attendees publish
-- theirs.
--
-- This reverses the guardrail `work_order_contact` was built for. The
-- product decision, made the 15th of August: someone who can help has to be
-- able to pick up the phone and call, and a two-field gate in front of the
-- number was buying an appearance of protection rather than protection —
-- the number was handed to anyone who typed a name into it, unverified,
-- and the audit log recorded a string nobody could check.
--
-- What follows from that, and is the whole of this migration: if the data
-- is public, the machinery that existed only to keep it private is dead
-- weight. A separate table with its own visibility rules, an access log, a
-- reveal-once response — none of them mean anything once the same fields
-- are projected in the public view. They are removed rather than left
-- switched off.
--
-- What this does NOT do is decide for the reporter. The fields stay
-- optional in the form, and the form now has to say plainly that whatever
-- goes in them will be visible to anyone — see WORK_ORDER_FORM. A person
-- reporting their neighbour's damaged house can still leave them blank.

-- --------------------------------------------------- contact, inlined ---
-- Back onto `work_order` itself. The split existed so one half could be
-- published and the other could not; with both halves public it is one row
-- read on every render and a join for nothing.
alter table work_order
  add column exact_address text,
  add column contact_name  text,
  add column phone         text,
  add column notes         text,
  add constraint work_order_phone_shape
    check (phone is null or phone ~ '^\d{7,15}$');

update work_order w
   set exact_address = c.exact_address,
       contact_name  = c.contact_name,
       phone         = c.phone,
       notes         = c.notes
  from work_order_contact c
 where c.work_order_id = w.id;

-- The view reads the table, so it goes first.
drop view if exists work_order_public;

drop table if exists work_order_contact;

-- Nothing left to audit: the reveal it recorded is now a page load. Kept
-- rows would describe a rule that no longer exists, which is worse than no
-- log at all.
drop table if exists work_order_access;

-- ------------------------------------------------------ attendee notes ---
-- "Varias personas pueden atenderlo y poner una nota." Several attendees
-- was already true (see work_order_attendance); what was missing is the
-- one thing they need to tell each other — "voy mañana a las 8 con la
-- volqueta" — so the second person does not duplicate the first one's trip.
alter table work_order_attendance
  add column note text,
  add constraint work_order_attendance_note_length
    check (note is null or length(note) <= 500);

-- Attendance becomes readable by anyone, which it was not: the count was
-- projected onto work_order and the rows themselves were service-role only.
-- Reading, not writing — every write in this schema still goes through the
-- DAL with the service role, and granting select does not change that.
create policy work_order_attendance_read_public on work_order_attendance
  for select using (true);

create view work_order_attendance_public with (security_invoker = on) as
select a.id,
       a.work_order_id,
       a.name,
       a.phone,
       a.note,
       a.created_at
from work_order_attendance a;

-- ------------------------------------------------------------------ view --
create view work_order_public with (security_invoker = on) as
select w.id,
       w.category,
       w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name                            as neighborhood,
       w.status,
       w.attendee_count,
       w.exact_address,
       w.contact_name,
       w.phone,
       w.notes,
       (w.verified_at is not null) as verified,
       w.confirmed_count,
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;
