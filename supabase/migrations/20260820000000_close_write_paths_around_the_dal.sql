-- Close the three write paths that go around the data access layer.
--
-- The project's stated rule is that `data/` is the only path to the database.
-- That was true of the application code and false of the database itself:
-- PostgREST exposes every table and every function to `anon`/`authenticated`
-- unless something revokes them, and three things were never revoked.
--
-- None of this migration touches data. It is three revokes and one trigger,
-- and it is independent of the pending contract migration
-- (20260818090000) — it names only tables that exist under both the plural
-- and the compatibility-view world.

-- 1. Self-service privilege escalation.
--
-- `profile_update_own` (20260813000000) allows a signed-in user to UPDATE
-- their own row, and `role` is a column of that row. Nothing revoked the
-- default UPDATE grant, so `PATCH /rest/v1/profiles?id=eq.<self>` with
-- {"role":"curator"} passed the policy and made anyone who signed in with
-- Google a curator: publish, hide, delete, close cases as `closed_rejected`,
-- and relocate pins across the whole city.
--
-- The application never writes to `profiles` — `data/user/require-user.ts`
-- only reads it, and `handle_new_user` inserts the row as the table owner —
-- so the grant buys nothing and costs everything.
revoke update on public.profiles from anon, authenticated;

-- Every other write goes with it. There is no INSERT or DELETE policy on
-- `profiles`, so RLS was already refusing those, but the row is created by
-- `handle_new_user` as the table owner and no client has any business
-- writing one. TRUNCATE is the reason not to lean on RLS alone here: it is
-- not a row operation and no policy is consulted for it.
revoke insert, delete, truncate on public.profiles from anon, authenticated;

-- Defence in depth, so that a later `grant update (full_name)` cannot quietly
-- reopen the hole. Writes made with the service key carry no JWT, so
-- `auth.uid()` is null there and the curator tooling still works.
create or replace function public.forbid_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null then
    raise exception 'role is not self-assignable';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_is_not_self_assignable on public.profiles;
create trigger profiles_role_is_not_self_assignable
  before update on public.profiles
  for each row execute function public.forbid_self_role_change();

-- 2. A second door onto the confidence counter.
--
-- `site_confirmations` had INSERT granted to anon plus a policy that allowed
-- anyone, and `confirmation_bumps_count` (20260814020000) increments
-- `sites.confirmed_count` and resets `confirmed_at` on every row. That made
-- both the confidence level the map draws and the freshness clock directly
-- writable in a loop by a stranger, with no business rule in front of them.
--
-- `SiteDAL.confirmStatus` writes this table with the service key, so it is
-- unaffected.
revoke insert on public.site_confirmations from anon, authenticated;

-- The policy that allowed it is dead weight once the grant is gone. It was
-- renamed along with the table on 18 August, so the name here is the plural
-- one; the singular `confirmation_insert_anyone` no longer exists.
drop policy if exists site_confirmations_insert_anyone on public.site_confirmations;

-- 3. Functions that were never revoked.
--
-- 20260814000000 established the rule — Postgres grants EXECUTE to PUBLIC on
-- every new function, and PostgREST publishes it as an RPC — but the five
-- functions written after that date did not follow it.
--
-- `upsert_neighborhood` is the one that matters: it is `security definer` and
-- writes `neighborhoods.boundary`, which is the input to `neighborhood_at`,
-- which is the only thing `canRelocate` uses to decide whether somebody may
-- move a pin. Rewriting one polygon to cover the city turns "only inside its
-- own barrio" into "anywhere", and corrupts the panel's filter and every
-- count along with it. It is called with the service key
-- (`scripts/seed-barrios.mjs`).
--
-- `neighborhood_at` already revoked itself when it was written
-- (20260814080000) and needs nothing here. `find_nearby_sites` deliberately
-- keeps its grant: `SiteDAL.findNearby` calls it through the session-bound
-- client, which is what lets the report form say "confirm that one" instead
-- of creating a second pin for the same coliseum.
revoke execute on function public.upsert_neighborhood(text, text, text)
  from public, anon, authenticated;

-- The standing rule, so the next function does not repeat this:
-- every `create function` in `public` is followed by a revoke from
-- `public, anon, authenticated`, and a grant back only to the roles that
-- actually call it.
