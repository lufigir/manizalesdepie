-- Animals: lost, found, sighted.
--
-- Its own table rather than a kind of site, because it is not a place. A lost
-- animal has no location — that is the definition of lost. What it has is a
-- last sighting, which is a hint about the past, and a photo, which is what
-- actually reunites it. The map is secondary here for the first time in this
-- product, and the schema says so: the point is nullable.
--
-- Deliberately NOT modelled on missing persons, which AGENTS.md puts out of
-- scope and delegates to the Red Cross. An animal has no privacy interest of
-- its own, and the only human data here is the finder's own phone number,
-- volunteered by them.

create type animal_kind as enum ('lost', 'found', 'sighted');
create type animal_species as enum ('dog', 'cat', 'other');

create table animal_report (
  id            uuid primary key default gen_random_uuid(),
  kind          animal_kind    not null,
  species       animal_species not null,

  -- A found dog has no name anyone knows. Nullable on purpose.
  pet_name      text,
  -- Collar, colour, size, temperament: what makes it recognisable.
  description   text not null,
  -- Path in the animals storage bucket. Nullable because a report with no
  -- photo is still worth publishing — but the UI leads with photos, so it will
  -- always be asked for.
  photo_path    text,

  last_seen_at  timestamptz not null,
  -- Where it was SEEN, not where it is. Drawn as a dashed marker so it can
  -- never be read as "the animal is here".
  last_seen     geography (point, 4326),
  zone          text,

  -- How the animal gets home. Required: a photo with no way to call is a
  -- poster nobody can answer.
  whatsapp      text not null,

  -- Set when the animal is back with its family. The row is not deleted —
  -- nothing here is — it is closed, which also tells the next person that this
  -- one already ended well.
  resolved_at   timestamptz,

  published        boolean     not null default true,
  verified_by      uuid references profile (id) on delete set null,
  verified_at      timestamptz,
  confirmed_count  smallint    not null default 0,
  confirmed_at     timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '30 days',
  created_by       uuid references profile (id) on delete set null,
  created_at       timestamptz not null default now(),

  constraint animal_whatsapp_shape check (whatsapp ~ '^\d{10,15}$')
);

create index animal_report_live_idx on animal_report (published, kind, resolved_at);
create index animal_report_seen_idx on animal_report using gist (last_seen);

alter table animal_report enable row level security;

create policy animal_report_read_published on animal_report
  for select using (published or is_curator());

create view animal_report_public with (security_invoker = on) as
select a.id, a.kind, a.species, a.pet_name, a.description, a.photo_path,
       a.last_seen_at,
       st_x(a.last_seen::geometry) as longitude,
       st_y(a.last_seen::geometry) as latitude,
       a.zone, a.whatsapp,
       a.resolved_at,
       (a.verified_at is not null) as verified,
       a.confirmed_count, a.confirmed_at, a.expires_at, a.published, a.created_by
from animal_report a;

-- Photo storage.
--
-- Public read: a lost-pet poster that only some people can see is not a poster.
-- Writes carry no policy at all, so only the service role can upload — the same
-- single door every other write goes through. A public insert policy here would
-- let anyone put any image on a public map.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animals', 'animals', true, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists animals_public_read on storage.objects;
create policy animals_public_read on storage.objects
  for select using (bucket_id = 'animals');
