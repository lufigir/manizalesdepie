-- Open publication: the curator stops being a gate and becomes a signal.
--
-- The old model held everything at published = false until a curator looked at
-- it. Ushahidi ships that same behaviour as a *toggle*, not a law, and the
-- documented failure of leaving it on during a fast emergency is that the human
-- reviewer becomes the bottleneck: report volume congests the queue and the
-- information reaches the field late, which in this product means it does not
-- reach it at all.
--
-- What replaces it is the pattern those platforms converged on: publish
-- immediately, and show confidence instead of filtering by it. Three levels,
-- none of them hidden:
--
--   sin confirmar   nobody has vouched for it yet   -> drawn faint
--   confirmado      N people said it is still true  -> drawn solid
--   verificado      a curator checked the source    -> badge
--
-- `published` survives as the curator's after-the-fact lever for taking
-- something down, which is the opposite direction from before. The seeded rows
-- stay false on purpose: their coordinates are still unverified.

-- --------------------------------------------------- anonymous authorship ---
-- A volunteer call and a resource offer could not exist without an account,
-- which is exactly the friction this change removes. Nullable, like site.

alter table volunteer_call alter column created_by drop not null;
alter table resource_offer alter column created_by drop not null;

alter table volunteer_call
  drop constraint volunteer_call_created_by_fkey,
  add constraint volunteer_call_created_by_fkey
    foreign key (created_by) references profile (id) on delete set null;

alter table resource_offer
  drop constraint resource_offer_created_by_fkey,
  add constraint resource_offer_created_by_fkey
    foreign key (created_by) references profile (id) on delete set null;

-- ------------------------------------------------------- publish by default -

alter table site           alter column published set default true;
alter table volunteer_call alter column published set default true;
alter table work_order     alter column published set default true;
alter table resource_offer alter column published set default true;

-- ------------------------------------------------------ confidence counter --
-- Denormalized on the row because the map reads it on every render and a count
-- over `confirmation` per pin would be a query per marker. This follows the
-- precedent already set by confirmed_at.

alter table site           add column confirmed_count smallint not null default 0;
alter table volunteer_call add column confirmed_count smallint not null default 0;
alter table work_order     add column confirmed_count smallint not null default 0;
alter table resource_offer add column confirmed_count smallint not null default 0;
alter table closed_road    add column confirmed_count smallint not null default 0;

-- The counter is maintained here rather than in the DAL so it cannot drift:
-- every path that inserts a confirmation updates it, including a curator
-- working directly in SQL.
--
-- "no_longer_valid" does not increment. Someone saying a place is gone is not
-- evidence that it is there, and letting it count would make a dead pin look
-- more trustworthy the more people reported it dead.
create or replace function bump_confirmation_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.result = 'no_longer_valid' then
    return new;
  end if;

  case new.entity
    when 'site' then
      update public.site set confirmed_count = confirmed_count + 1, confirmed_at = now()
       where id = new.entity_id;
    when 'volunteer_call' then
      update public.volunteer_call set confirmed_count = confirmed_count + 1, confirmed_at = now()
       where id = new.entity_id;
    when 'work_order' then
      update public.work_order set confirmed_count = confirmed_count + 1, confirmed_at = now()
       where id = new.entity_id;
    when 'resource_offer' then
      update public.resource_offer set confirmed_count = confirmed_count + 1, confirmed_at = now()
       where id = new.entity_id;
    when 'closed_road' then
      update public.closed_road set confirmed_count = confirmed_count + 1, confirmed_at = now()
       where id = new.entity_id;
  end case;

  return new;
end;
$fn$;

revoke execute on function bump_confirmation_count() from public, anon, authenticated;

create trigger confirmation_bumps_count
  after insert on confirmation
  for each row execute function bump_confirmation_count();

-- --------------------------------------------------- anonymous confirmation -
-- Confirming was the one write an anonymous visitor could not make, which
-- inverted the incentive: the person standing in front of the closed shelter is
-- the least likely to have an account.

drop policy confirmation_insert_signed_in on confirmation;

create policy confirmation_insert_anyone on confirmation
  for insert with check (
    -- A signed-in caller may only sign a confirmation with their own identity;
    -- anonymous ones stay unsigned. Nobody gets to confirm as someone else.
    created_by is null or created_by = (select auth.uid())
  );

-- ------------------------------------------------------------------- views --
-- Recreated to project the new counter. security_invoker stays on: without it
-- both views bypass every policy above.

drop view work_order_public;
drop view site_public;

create view site_public with (security_invoker = on) as
select s.id, s.type, s.name, s.description, s.address,
       st_x(s.location::geometry) as longitude,
       st_y(s.location::geometry) as latitude,
       n.name as neighborhood,
       s.status, s.schedule, s.whatsapp, s.source_url,
       (s.verified_at is not null) as verified,
       s.confirmed_count,
       s.confirmed_at, s.expires_at, s.published, s.created_by
from site s
left join neighborhood n on n.id = s.neighborhood_id
where s.merged_into_id is null;

create view work_order_public with (security_invoker = on) as
select w.id, w.category, w.description,
       st_x(w.approx_location::geometry) as longitude,
       st_y(w.approx_location::geometry) as latitude,
       n.name as neighborhood,
       w.status, w.claimed_by, w.releases_at,
       (w.verified_at is not null) as verified,
       w.confirmed_count,
       w.confirmed_at, w.created_at, w.published
from work_order w
left join neighborhood n on n.id = w.neighborhood_id
where w.merged_into_id is null;
