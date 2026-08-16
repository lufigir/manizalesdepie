-- The DAL needs to ask which barrio a coordinate falls in.
--
-- `neighborhood_at` already exists (20260814080000) and is already the one
-- answer to that question in this system — the same function the insert
-- triggers use to stamp `neighborhood_id`. Relocation authorizes against it:
-- anybody may move a pin inside its own barrio, so the server has to resolve
-- the destination's barrio BEFORE writing, not read it back afterwards.
--
-- It was revoked from public/anon/authenticated the day it was written, and
-- that revoke also took service_role with it, because the grant it removed was
-- the blanket PUBLIC one. This hands it back to service_role alone: the DAL's
-- admin client, which is server-only and already the single door to every
-- write here. anon and authenticated stay locked out — they talk to PostgREST
-- directly, and the browser has `public/barrios.geojson` if it wants to draw
-- the same answer for itself.

grant execute on function neighborhood_at(double precision, double precision)
  to service_role;
