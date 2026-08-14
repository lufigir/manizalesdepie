-- The Alcaldía's daily balance.
--
-- In the database rather than in a constant because it is the most perishable
-- data in the whole product: it is superseded every evening, and a hardcoded
-- figure would keep asserting yesterday's count with total confidence. Same
-- rule as every other perishable table here — it carries expires_at.
--
-- Every column is nullable. The report is prose written by a person and its
-- shape changes night to night; a field missing tomorrow must not block the
-- rest from being recorded.

create table situation_report (
  id                    uuid primary key default gen_random_uuid(),
  reported_at           timestamptz not null,
  source                text        not null,
  source_url            text,

  eval_requested        integer,
  eval_done             integer,
  families_evacuated    integer,
  homes_partial         integer,
  homes_total_loss      integer,

  affected_people       integer,
  injured               integer,
  dead                  integer,
  in_shelters           integer,
  pets_in_shelters      integer,

  villages_affected     integer,
  villages_total        integer,
  schools_public        integer,
  schools_private       integer,
  merchants_affected    integer,
  gas_pending           integer,

  notes                 text,
  expires_at            timestamptz not null,
  created_at            timestamptz not null default now()
);

create index situation_report_latest_idx on situation_report (reported_at desc);

alter table situation_report enable row level security;

-- Public by construction: these are figures the Alcaldía publishes to everyone.
create policy situation_report_read_all on situation_report
  for select using (true);

-- Writes go through the service-role DAL, like every other table here.
