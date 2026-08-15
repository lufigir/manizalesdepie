-- The vocabulary for the entry book, 15 August. Its own migration on purpose.
--
-- `alter type ... add value` cannot be followed by a statement that USES the
-- new value inside the same transaction, and the Supabase CLI runs one
-- transaction per file. Everything that reads 'attended' therefore lives in
-- the next migration; this one only widens the types.

-- What somebody can say about a case. Four verbs, not a status: nobody sets
-- the state of a case any more, they report what they did or saw, and
-- `sync_work_order_state` reads the state out of the pile.
create type work_order_update_kind as enum (
  'on_the_way',   -- "yo puedo atender"
  'helped',       -- "ya ayudé", which does NOT on its own close anything
  'still_needed', -- "sigue haciendo falta", the counterweight that reopens
  'not_real'      -- "esto no es un caso real" — a report, never an execution
);

-- Someone has helped and the case is still open to more hands. This is the
-- state the old model had no way to express: it went straight from "claimed"
-- to closed, so the only way to record having helped was to declare the case
-- over on everybody else's behalf.
alter type work_order_status add value if not exists 'attended' after 'claimed';
