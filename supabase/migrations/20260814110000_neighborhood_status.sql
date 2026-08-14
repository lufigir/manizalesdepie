-- Per-barrio status: evacuation and utilities.
--
-- Different question from `situation_report`: that is one number per metric
-- for the whole city, this is "is MY barrio evacuated, does MY barrio have
-- gas". Same perishability rule as everything else here (confirmed_at +
-- expires_at), and public by construction like `situation_report` — these are
-- utility and Alcaldía announcements, not addresses that need a curator to
-- fix a dropped pin, so there is no `published` gate.
--
-- One row per neighbourhood: this is current state, not a log of incidents.
-- A later report for the same barrio replaces the row rather than appending
-- to it, same as a site's own `status` column.

create type utility_status as enum ('normal', 'suspended', 'unknown');

create table neighborhood_status (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhood (id) on delete cascade unique,

  evacuated       boolean not null default false,
  gas_status      utility_status not null default 'unknown',
  power_status    utility_status not null default 'unknown',
  water_status    utility_status not null default 'unknown',

  notes           text,
  source          text not null,
  source_url      text,

  confirmed_at    timestamptz not null,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

alter table neighborhood_status enable row level security;

create policy neighborhood_status_read_all on neighborhood_status
  for select using (true);

-- Projects the barrio's name and municipality alongside its status, the same
-- way `site_public` joins in `neighborhood.name` — the app matches a barrio by
-- name (it is what `barrios.geojson` and every report form carry), never by
-- this table's foreign key.
create view neighborhood_status_public with (security_invoker = on) as
select ns.id,
       ns.neighborhood_id,
       n.name as neighborhood,
       n.municipality,
       ns.evacuated,
       ns.gas_status,
       ns.power_status,
       ns.water_status,
       ns.notes,
       ns.source,
       ns.source_url,
       ns.confirmed_at,
       ns.expires_at
from neighborhood_status ns
join neighborhood n on n.id = ns.neighborhood_id;
