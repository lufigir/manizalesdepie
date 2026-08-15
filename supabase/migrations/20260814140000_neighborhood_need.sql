-- "Este barrio necesita X". A frente the curator team declares, so that
-- armar un grupo can start from a problem already on record instead of
-- someone inventing the category, the priority and the barrio from nothing.
--
-- Curated by hand, same as `neighborhood_status`: no `.policy.ts`, no
-- `.actions.ts`, no write path from the app. This is our own prioritisation,
-- not a claim a curator has to verify against a source, so there is no
-- `published` gate either — same reasoning as `neighborhood_status_public`.
--
-- `category` reuses `call_category` rather than inventing a parallel enum: a
-- frente's category IS the kind of work a grupo does there, so "armar un
-- grupo aquí" can prefill it without translating between two vocabularies.
--
-- One row per barrio × category: this is current state, not a log. A later
-- declaration for the same pair replaces the row rather than appending to it,
-- the same rule `neighborhood_status` follows for a barrio's utilities.

create type need_priority as enum ('critical', 'high', 'normal');

create table neighborhood_need (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhood (id) on delete cascade,
  category        call_category not null,
  priority        need_priority not null default 'normal',
  note            text,
  source          text,
  confirmed_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  created_by      uuid references profile (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (neighborhood_id, category)
);

create index neighborhood_need_live_idx on neighborhood_need (expires_at);

alter table neighborhood_need enable row level security;

create policy neighborhood_need_read_all on neighborhood_need
  for select using (true);

-- Writes go in by hand (seed data, or a curator with the service role) —
-- exactly like neighborhood_status. No insert/update policy is granted here;
-- adding one would open a write path this app's UI never asks for.

-- ----------------------------------------------------------------- view ---
-- Projects the barrio's name, municipality and centroid, the same shape
-- `neighborhood_status_public` uses for name/municipality and `site_public`
-- uses for the coordinate — the frente needs both to file under a barrio name
-- and to draw a marker at its centre.
--
-- Rows whose barrio has no centroid are dropped rather than returned with a
-- null coordinate, same rule as `neighborhood_public`: a frente the map
-- cannot place a chip on is not a row the panel can offer to jump to.
create view neighborhood_need_public with (security_invoker = on) as
select nn.id,
       nn.neighborhood_id,
       n.name         as neighborhood,
       n.municipality,
       st_x(n.centroid::geometry) as longitude,
       st_y(n.centroid::geometry) as latitude,
       nn.category,
       nn.priority,
       nn.note,
       nn.source,
       nn.confirmed_at,
       nn.expires_at
from neighborhood_need nn
join neighborhood n on n.id = nn.neighborhood_id
where n.centroid is not null;
