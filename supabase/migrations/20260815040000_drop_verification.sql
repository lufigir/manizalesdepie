-- "Verificado por un curador" was a promise about staffing, not about data.
--
-- It was the top of a three-level confidence ladder — sin confirmar,
-- confirmado, verificado — and the only rung nobody in this project can
-- actually reach: there will not be a curator team, so `verified_at` was
-- never going to stop being null on any of the five tables that carried it.
--
-- Same argument that took `confirmed_count` off four tables earlier today.
-- A signal nobody can produce is not a neutral placeholder; it is a claim
-- the interface keeps making and the world never answers. Better to have
-- two honest levels on sitios and plain freshness everywhere else than a
-- third that only ever means "we did not get to it".
--
-- `published` survives, and it is the distinction worth keeping: hiding a
-- spam row is a thing one person does in a second, and it needs no roster.

drop view site_public;
drop view volunteer_call_public;
drop view resource_offer_public;
drop view work_order_public;
drop view animal_report_public;

alter table site           drop column verified_by, drop column verified_at;
alter table volunteer_call drop column verified_by, drop column verified_at;
alter table resource_offer drop column verified_by, drop column verified_at;
alter table work_order     drop column verified_by, drop column verified_at;
alter table animal_report  drop column verified_by, drop column verified_at;

create view site_public with (security_invoker = on) as
select s.id, s.type, s.name, s.description, s.address,
       st_x(s.location::geometry) as longitude,
       st_y(s.location::geometry) as latitude,
       n.name as neighborhood,
       s.status, s.schedule, s.whatsapp,
       s.confirmed_count,
       s.confirmed_at, s.expires_at, s.published, s.created_by
from site s
left join neighborhood n on n.id = s.neighborhood_id
where s.merged_into_id is null;

create view volunteer_call_public with (security_invoker = on) as
select c.id, c.category, c.description,
       st_x(c.meeting_point::geometry) as longitude,
       st_y(c.meeting_point::geometry) as latitude,
       c.meeting_address,
       n.name as neighborhood,
       c.starts_at, c.whatsapp,
       c.confirmed_at, c.expires_at, c.published, c.created_by
from volunteer_call c
left join neighborhood n on n.id = c.neighborhood_id
where c.merged_into_id is null;

create view resource_offer_public with (security_invoker = on) as
select r.id, r.type, r.description, r.area,
       st_x(r.location::geometry) as longitude,
       st_y(r.location::geometry) as latitude,
       n.name as neighborhood,
       r.whatsapp,
       r.confirmed_at, r.expires_at, r.published, r.created_by
from resource_offer r
left join neighborhood n on n.id = r.neighborhood_id;

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
       w.confirmed_at,
       w.expires_at,
       w.created_at,
       w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;

create view animal_report_public with (security_invoker = on) as
select a.id, a.kind, a.species, a.pet_name, a.description, a.photo_path,
       a.last_seen_at,
       st_x(a.last_seen::geometry) as longitude,
       st_y(a.last_seen::geometry) as latitude,
       a.zone, a.whatsapp, a.resolved_at,
       a.confirmed_at, a.expires_at, a.published, a.created_by
from animal_report a;
