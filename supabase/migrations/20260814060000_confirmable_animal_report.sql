-- Lets "sigue perdido" / "ya apareció" ride the same confirmation ledger as
-- everything else. Separate migration for the same ALTER TYPE reason.
alter type confirmable_entity add value if not exists 'animal_report';
