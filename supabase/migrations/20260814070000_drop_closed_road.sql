-- Closed roads are out of scope.
--
-- They were hand-curated because INVIAS publishes the road network but not the
-- daily closures, which arrive as PDF bulletins. Keeping that current by hand
-- is a standing commitment nobody took, and a stale road closure is worse than
-- none: it reroutes someone away from a road that reopened this morning.
--
-- Dropped rather than left empty. Dead schema outlives the reason for it, and
-- the next person to read this database would have to ask why it is here.
drop table if exists closed_road;
drop type if exists road_status;
