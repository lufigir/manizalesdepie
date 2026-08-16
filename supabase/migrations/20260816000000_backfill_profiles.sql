-- Every account that has no profile row gets one.
--
-- `on_auth_user_created` writes the row on insert, so this only ever catches
-- accounts created before that trigger existed — but one of those was enough
-- to make the map keep offering "Entrar" to somebody who was already signed
-- in, because the session resolver read a missing profile as "no session".
--
-- The resolver no longer does that (it degrades to 'visitor'), which is the
-- fix. This is the repair: a visitor cannot report or curate, and these
-- accounts were meant to be contributors.
--
-- Idempotent, so it is safe on a database that never had the problem.

insert into public.profile (id, full_name, role)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.email,
    'Anónimo'
  ),
  case
    when u.email = 'luisgir827@gmail.com' then 'curator'::public.user_role
    else 'contributor'::public.user_role
  end
from auth.users u
where not exists (select 1 from public.profile p where p.id = u.id);
