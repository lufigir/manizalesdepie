-- "Prioridad: media" out of the contact notes.
--
-- It was never a field and never drove anything: it is prose, sitting in
-- `work_order.notes` underneath the phone number — some of it copied out of
-- the press reporting the seed was built from ("Prioridad alta."), most of it
-- loaded straight into Postgres over MCP with the spreadsheets of real cases
-- ("Prioridad: alta", "Prioridad: media").
--
-- On screen it read as a ranking the app had assigned, and the app has no
-- such ranking for a case: `lib/urgency.ts` weighs a BARRIO's declared
-- frente, which is a different thing and is not shown on a card. So the line
-- claimed a judgement nobody made, about a household, with no way for anyone
-- to act on it or correct it. Fourteen of the fifteen carried nothing else.
--
-- Only the phrase goes. Where a note carries anything besides it — one warns
-- that a phone number looks malformed — the rest is kept, because that part
-- is somebody's actual finding. A note left empty becomes null rather than
-- an empty string, so the card's `order.notes &&` guard hides the row
-- instead of rendering a blank line.

update work_order
set notes = nullif(
  trim(regexp_replace(notes, 'Prioridad\s*:?\s*(alta|media|baja)\.?\s*', '', 'gi')),
  ''
)
where notes ~* 'Prioridad\s*:?\s*(alta|media|baja)';
