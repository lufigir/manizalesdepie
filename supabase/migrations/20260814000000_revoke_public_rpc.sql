-- Close the second door to the database.
--
-- PostgREST exposes every function in the `public` schema as an RPC endpoint,
-- and Postgres grants EXECUTE to PUBLIC by default. That combination made
-- release_stale_claims() — a SECURITY DEFINER function that writes to
-- work_order — callable by anyone at POST /rest/v1/rpc/release_stale_claims.
-- Anonymous visitors could unclaim every claimed order in one request.
--
-- handle_new_user() is a trigger function that has no business being an
-- endpoint either. Postgres checks EXECUTE on a trigger function when the
-- trigger is created, not when it fires, so revoking here does not break
-- on_auth_user_created.
--
-- is_curator() is deliberately left alone: RLS policies evaluate as the
-- invoking role, so anon and authenticated must keep EXECUTE on it or every
-- read policy that calls it starts failing. It leaks nothing — it answers a
-- boolean about the caller's own profile.

revoke execute on function release_stale_claims() from public, anon, authenticated;
revoke execute on function handle_new_user()      from public, anon, authenticated;

-- The scheduled job and the data access layer run as service_role.
grant execute on function release_stale_claims() to service_role;
