-- Every write on sites, needs, need_updates, services and animal_reports
-- currently goes through the service-role client, which bypasses RLS
-- entirely. All the security model has behind it today is "the DAL happens
-- to check `canX()` before calling `createAdminSupabase()`" — a single layer,
-- with none of these tables carrying a single INSERT/UPDATE/DELETE policy.
-- A crafted PostgREST request with the anon key already has full table-level
-- INSERT/UPDATE/DELETE/TRUNCATE grants (Supabase's default) and nothing
-- behind that grant to stop it.
--
-- This migration makes RLS the second barrier the DAL's `canX()` checks were
-- always meant to have behind them, using the same two mechanisms the
-- existing schema already relies on elsewhere:
--
--   1. Column-level grants restrict WHICH columns anon/authenticated may
--      touch at all — curator-only facts (`published`, and everything
--      `sync_need_state`/`confirmation_bumps_count` derive) are simply never
--      granted to a role that could write them anonymously. This is enforced
--      before RLS is even evaluated, so it holds regardless of what a row
--      policy says.
--   2. Row policies (`using`/`with check`) express the row-level rules — that
--      `created_by` can't be forged, and — for `published`, the one curator
--      fact `authenticated` DOES get column access to, because a curator IS
--      `authenticated` at the Postgres role level — a trigger checks
--      `is_curator()` the same way `forbid_self_role_change` already does
--      for `profiles`.
--
-- `needs.status` gets neither: no grant, to anyone, ever. It is derived by
-- `sync_need_state` from `need_updates`, and a curator's manual close
-- (`closed_completed`/`closed_rejected`) goes through the service-role
-- client precisely so this table never has to open a door for it.
--
-- Independent of the pending contract migration (20260818090000, already
-- applied here) and of 20260820000000 (also already applied): this migration
-- does not touch `profiles` or `site_confirmations`, which that one already
-- closed to anon/authenticated writes entirely.

-- --------------------------------------------------------------- services --
-- Every other perishable table defaults its own `expires_at`; `services` was
-- the one exception, computed in `ServiceDAL.propose` as "7 days from now".
-- Giving it the same default it was always going to get removes the only
-- reason `expires_at` would otherwise need a client-facing INSERT grant —
-- the DAL simply stops sending it, same as `SiteDAL.propose` and
-- `AnimalDAL.report` already do.
alter table public.services
  alter column expires_at set default (now() + interval '7 days');

-- ------------------------------------------------------- the published gate
-- The one curator fact `authenticated` gets column access to at all, because
-- Postgres roles don't know what a curator is — `authenticated` is a signed-in
-- visitor and a curator alike. This is what tells them apart, reused across
-- every table below exactly the way `touch_updated_at` already is.
--
-- Not `security definer`: it needs no elevated privilege of its own (it only
-- reads NEW/OLD and calls the already-`security definer` `is_curator()`), and
-- marking it definer would make `current_user` report the function's owner
-- instead of the caller's role — which is the one thing this function has to
-- get right, since the service-role client (every curator action in this
-- app) has to sail through untouched.
create or replace function public.forbid_publish_toggle_by_non_curator()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.published is distinct from old.published
     and current_user <> 'service_role'
     and not public.is_curator()
  then
    raise exception 'published is curator-only';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------ sites --

revoke insert, update, delete, truncate on public.sites from anon, authenticated;

-- `SiteDAL.propose` — anyone, no account (`canProposeSite`). Never `id`
-- (server-generated), never `status`/`confirmed_at`/`confirmed_count`/
-- `expires_at` (all default themselves, matching what `propose` already
-- sends today) and never `neighborhood_id` (`site_sets_neighborhood`
-- overwrites it before this check ever runs, so granting it would buy
-- nothing but confusion).
grant insert (type, name, description, address, location, schedule, whatsapp, created_by)
  on public.sites to anon, authenticated;

create policy sites_insert_anyone on public.sites
  for insert to anon, authenticated
  with check (
    -- A signed-in reporter may only attribute the row to themselves;
    -- anonymous ones stay unattributed. Nobody reports as someone else.
    created_by is null or created_by = (select auth.uid())
  );

-- `SiteDAL.update` — anyone, no account (`canEditSite`): the fields a
-- stranger standing in front of the place can correct. `published` is
-- listed separately below, granted to `authenticated` only — see the
-- trigger.
grant update (type, name, description, address, schedule, whatsapp)
  on public.sites to anon, authenticated;

-- `SiteDAL.publish` / `setPublished` — curator-only (`canPublishSite`,
-- `canManageSite`). Both still run through the service-role client (see
-- `site.dal.ts`), so `authenticated` never actually needs this in practice;
-- it exists so RLS holds even if that ever changes.
grant update (published) on public.sites to authenticated;

-- One policy for both grants above: the column privileges already decide
-- which fields a given role can touch at all, so the row policy only has to
-- say "yes, on this row" — same shape as `site_read_published`'s
-- `published or is_curator()`, minus the read-only half of that OR, because
-- non-curators must never see a hidden row's write path open either.
create policy sites_update_anyone on public.sites
  for update to anon, authenticated
  using (true)
  with check (true);

drop trigger if exists sites_forbid_publish_toggle on public.sites;
create trigger sites_forbid_publish_toggle
  before update on public.sites
  for each row execute function public.forbid_publish_toggle_by_non_curator();

-- `SiteDAL.remove` — curator-only (`canManageSite`), stays on the
-- service-role client. Granted to `authenticated` anyway, gated by
-- `is_curator()`, for the same reason as the `published` grant above: RLS
-- should hold on its own, not only because the DAL happens to route this
-- correctly today.
grant delete on public.sites to authenticated;

create policy sites_delete_curator on public.sites
  for delete to authenticated
  using (is_curator());

-- `SiteDAL.confirmStatus` and `relocate` stay on the service-role client —
-- see the comments left in `site.dal.ts` for why. Neither `status`,
-- `confirmed_at`, `expires_at`, `confirmed_count`, `neighborhood_id` nor
-- `location` is granted to anon/authenticated for UPDATE at all, so there is
-- no RLS policy to write for them: the grant itself is the whole barrier.

-- -------------------------------------------------------------- site_items
-- Nothing in this application writes `site_items` — `SiteDAL` only ever
-- reads it, nested under a site. The table carried the same blanket grant as
-- every other one here with no policy behind it; closing the grant removes
-- a write surface that was never used rather than opening one.
revoke insert, update, delete, truncate on public.site_items from anon, authenticated;

-- ------------------------------------------------------------------ needs --

revoke insert, update, delete, truncate on public.needs from anon, authenticated;

-- `NeedDAL.report` — anyone, no account (`canReportNeed`). `status` is not
-- listed and never will be: it is `sync_need_state`'s alone, derived from
-- `need_updates`. Same reasoning as `sites` for everything else left out —
-- `confirmed_at`, `expires_at`, `closed_at`, `neighborhood_id`, `id`.
grant insert (category, description, location, exact_address, contact_name, phone, notes, created_by)
  on public.needs to anon, authenticated;

create policy needs_insert_anyone on public.needs
  for insert to anon, authenticated
  with check (
    created_by is null or created_by = (select auth.uid())
  );

-- `NeedDAL.update` — anyone, no account (`canUpdateNeed`). The contact
-- fields are written once, at `report`, and never patched again — see
-- `updateNeedSchema` — so they are not in this grant.
grant update (category, description) on public.needs to anon, authenticated;

-- `NeedDAL.setPublished` — curator-only (`canManageNeed`), stays on the
-- service-role client. Same reasoning as `sites.published`.
grant update (published) on public.needs to authenticated;

create policy needs_update_anyone on public.needs
  for update to anon, authenticated
  using (true)
  with check (true);

drop trigger if exists needs_forbid_publish_toggle on public.needs;
create trigger needs_forbid_publish_toggle
  before update on public.needs
  for each row execute function public.forbid_publish_toggle_by_non_curator();

-- `NeedDAL.remove` — curator-only (`canManageNeed`), stays on the
-- service-role client. Same reasoning as `sites.remove`.
grant delete on public.needs to authenticated;

create policy needs_delete_curator on public.needs
  for delete to authenticated
  using (is_curator());

-- `NeedDAL.close` and `relocate` stay on the service-role client — see the
-- comments left in `need.dal.ts`. `status`, `closed_at`, `expires_at`,
-- `confirmed_at` and `neighborhood_id` are not granted to anon/authenticated
-- for UPDATE at all — the grant is the barrier, not a policy.

-- ------------------------------------------------------------ need_updates

revoke insert, update, delete, truncate on public.need_updates from anon, authenticated;

-- `NeedDAL.postUpdate` — anyone, no account, any of the four kinds
-- (`canPostNeedUpdate`). No `created_by` column exists here to forge —
-- entries carry only an optional free-text name and phone, the same
-- low-friction rule as reporting the case itself.
grant insert (need_id, kind, name, phone, note) on public.need_updates to anon, authenticated;

create policy need_update_insert_anyone on public.need_updates
  for insert to anon, authenticated
  with check (true);

-- No UPDATE grant, to either role: the book is append-only by design — see
-- AGENTS.md. There is nothing to correct in an entry once it is posted, only
-- something a curator can remove.

-- `NeedDAL.removeUpdate` — curator-only (`canDeleteNeedUpdate`), stays on
-- the service-role client. Deleting re-fires `sync_need_state` regardless of
-- which client performed it.
grant delete on public.need_updates to authenticated;

create policy need_update_delete_curator on public.need_updates
  for delete to authenticated
  using (is_curator());

-- --------------------------------------------------------------- services --

revoke insert, update, delete, truncate on public.services from anon, authenticated;

-- `ServiceDAL.propose` — anyone, no account (`canProposeService`).
-- `expires_at` is not listed: it now defaults itself, see above.
grant insert (type, description, area, location, whatsapp, created_by)
  on public.services to anon, authenticated;

create policy services_insert_anyone on public.services
  for insert to anon, authenticated
  with check (
    created_by is null or created_by = (select auth.uid())
  );

-- `ServiceDAL.update` — anyone, no account (`canEditService`).
grant update (type, description, area, whatsapp) on public.services to anon, authenticated;

-- `ServiceDAL.setPublished` — curator-only (`canManageService`), stays on
-- the service-role client. Same reasoning as `sites.published`.
grant update (published) on public.services to authenticated;

create policy services_update_anyone on public.services
  for update to anon, authenticated
  using (true)
  with check (true);

drop trigger if exists services_forbid_publish_toggle on public.services;
create trigger services_forbid_publish_toggle
  before update on public.services
  for each row execute function public.forbid_publish_toggle_by_non_curator();

-- `ServiceDAL.remove` — curator-only (`canManageService`), stays on the
-- service-role client.
grant delete on public.services to authenticated;

create policy services_delete_curator on public.services
  for delete to authenticated
  using (is_curator());

-- --------------------------------------------------------- animal_reports --

revoke insert, update, delete, truncate on public.animal_reports from anon, authenticated;

-- `AnimalDAL.report` — anyone, no account (`canReportAnimal`). `photo_path`
-- is here because the upload itself already went through the service-role
-- client (the bucket has no insert policy of its own — see
-- `AnimalDAL.uploadPhoto`); this only writes the returned path onto the row.
grant insert (kind, species, pet_name, description, photo_path, last_seen_at, last_seen, zone, whatsapp, created_by)
  on public.animal_reports to anon, authenticated;

create policy animal_report_insert_anyone on public.animal_reports
  for insert to anon, authenticated
  with check (
    created_by is null or created_by = (select auth.uid())
  );

-- `AnimalDAL.update` — anyone, no account (`canEditAnimal`) — and
-- `AnimalDAL.resolve` — anyone, no account (`canResolveAnimal`), the same bar
-- for the same reason: the person who reunites a dog is rarely the one who
-- posted it. Neither `photo_path` nor the coordinate is here — see
-- `updateAnimalSchema`.
grant update (kind, species, pet_name, description, zone, whatsapp, resolved_at)
  on public.animal_reports to anon, authenticated;

-- `AnimalDAL.setPublished` — curator-only (`canManageAnimal`), stays on the
-- service-role client. Same reasoning as `sites.published`.
grant update (published) on public.animal_reports to authenticated;

create policy animal_report_update_anyone on public.animal_reports
  for update to anon, authenticated
  using (true)
  with check (true);

drop trigger if exists animal_report_forbid_publish_toggle on public.animal_reports;
create trigger animal_report_forbid_publish_toggle
  before update on public.animal_reports
  for each row execute function public.forbid_publish_toggle_by_non_curator();

-- `AnimalDAL.remove` — curator-only (`canManageAnimal`), stays on the
-- service-role client.
grant delete on public.animal_reports to authenticated;

create policy animal_report_delete_curator on public.animal_reports
  for delete to authenticated
  using (is_curator());
