-- The census desks the Alcaldía opened (Milán, Chipre, Av. Santander, Centro)
-- are where an affected person registers to reach the census and the rent
-- subsidy. They serve the affected rather than the helper — the one exception
-- the product makes, because without the census there is no subsidy.
--
-- Its own migration: ALTER TYPE ... ADD VALUE cannot be used by a statement in
-- the same transaction that adds it.
alter type site_type add value if not exists 'census_point';
