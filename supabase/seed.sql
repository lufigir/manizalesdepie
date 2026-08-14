-- Manizales de Pie — seed data
--
-- ⚠️  COORDINATES ARE APPROXIMATE AND UNVERIFIED.
--
-- The names, needs, road closures and blood-type urgencies below come from
-- press and institutional reporting on the 10 August 2026 earthquake. The
-- latitude/longitude values do NOT: they are rough placements derived from the
-- sector each venue sits in.
--
-- Every row is therefore seeded with published = false. Sending someone to the
-- wrong shelter during an emergency is worse than having no pin at all, so a
-- curator must geocode and confirm each row before it becomes visible. Use the
-- /admin queue: verify the address, fix the point, then publish.

-- ------------------------------------------------------- neighborhoods -----
--
-- Placeholders only: `barrios.sql` upserts the official 114 with real
-- boundaries and overwrites these centroids on top. `on conflict do nothing`
-- so this file loads cleanly whether it runs before or after `barrios.sql` —
-- without it, running this after `barrios.sql` has already inserted the same
-- (name, municipality) pairs would abort the whole script.
--
-- Run `barrios.sql` BEFORE this file when possible: the sites below rely on
-- the `neighborhood_id`-stamping trigger, which resolves to null until a
-- barrio has a `boundary` polygon — that only exists after `barrios.sql` runs.

insert into neighborhood (name, municipality, centroid) values
  ('Centro',            'manizales',  st_point(-75.5174, 5.0689)::geography),
  ('Chipre',            'manizales',  st_point(-75.5253, 5.0733)::geography),
  ('Avenida Santander', 'manizales',  st_point(-75.4990, 5.0660)::geography),
  ('El Cable',          'manizales',  st_point(-75.4936, 5.0655)::geography),
  ('Palogrande',        'manizales',  st_point(-75.4934, 5.0648)::geography),
  ('Milán',             'manizales',  st_point(-75.4790, 5.0575)::geography),
  ('Los Naranjos',      'manizales',  st_point(-75.4835, 5.0602)::geography),
  ('Aranjuez',          'manizales',  st_point(-75.4880, 5.0480)::geography),
  ('La Estrella',       'manizales',  st_point(-75.48924, 5.05958)::geography),
  ('Palermo',           'manizales',  st_point(-75.48873, 5.05265)::geography),
  ('Versalles',         'manizales',  st_point(-75.49934, 5.06177)::geography),
  ('San Jorge',         'manizales',  st_point(-75.49942, 5.06699)::geography),
  ('Villamaría centro', 'villamaria', st_point(-75.5133, 5.0447)::geography)
on conflict (name, municipality) do nothing;

-- ---------------------------------------------------------------- sites ----

insert into site (type, name, description, address, location, neighborhood_id, status, schedule, source_url, published, expires_at)
select v.type, v.name, v.description, v.address, v.location,
       (select id from neighborhood n where n.name = v.neighborhood and n.municipality = v.municipality),
       v.status, v.schedule, v.source_url, false, now() + interval '24 hours'
from (values
  ('shelter'::site_type,
   'Coliseo Mayor',
   'Albergue principal habilitado por la Alcaldía. Reportadas cerca de 300 personas alojadas. La UPA atiende mascotas de las familias albergadas en el mismo recinto.',
   'Sector Palogrande',
   st_point(-75.4930, 5.0651)::geography,
   'Palogrande', 'manizales'::municipality,
   'open'::site_status,
   'Abierto 24 horas',
   'https://www.lapatria.com'),

  ('shelter'::site_type,
   'Coliseo Menor',
   'Albergue habilitado por la Alcaldía de Manizales.',
   'Sector Palogrande',
   st_point(-75.4938, 5.0644)::geography,
   'Palogrande', 'manizales'::municipality,
   'open'::site_status,
   'Abierto 24 horas',
   'https://www.lapatria.com'),

  ('shelter'::site_type,
   'CIC Aranjuez',
   'Centro de Integración Ciudadana habilitado como albergue temporal.',
   'Barrio Aranjuez',
   st_point(-75.4880, 5.0480)::geography,
   'Aranjuez', 'manizales'::municipality,
   'open'::site_status,
   'Abierto 24 horas',
   'https://www.lapatria.com'),

  ('blood_donation'::site_type,
   'Donación de sangre — Canchas auxiliares de Palogrande',
   'Punto de donación habilitado junto a la estación de Bomberos Palogrande. Urgencia declarada para los grupos O positivo y O negativo.',
   'Canchas auxiliares, junto a la estación de Bomberos Palogrande',
   st_point(-75.4941, 5.0656)::geography,
   'Palogrande', 'manizales'::municipality,
   'open'::site_status,
   'Consultar horario del día',
   'https://www.lapatria.com'),

  ('blood_donation'::site_type,
   'Hemocentro del Café',
   'Banco de sangre regional. Urgencia declarada para los grupos O positivo y O negativo.',
   'Manizales',
   st_point(-75.5010, 5.0670)::geography,
   'Avenida Santander', 'manizales'::municipality,
   'open'::site_status,
   'Consultar horario del día',
   'https://www.lapatria.com'),

  ('medical_post'::site_type,
   'Puesto de Mando Unificado — Bomberos Manizales',
   'PMU de la emergencia. Punto de coordinación institucional, no de recepción de donaciones.',
   'Estación de Bomberos de Manizales',
   st_point(-75.5120, 5.0682)::geography,
   'Centro', 'manizales'::municipality,
   'open'::site_status,
   'Abierto 24 horas',
   'https://www.lapatria.com'),

  ('collection_point'::site_type,
   'Centro de acopio Cruz Roja Caldas',
   'Recepción y clasificación de ayudas humanitarias. Se requieren voluntarios para empaque.',
   'Manizales',
   st_point(-75.5100, 5.0695)::geography,
   'Centro', 'manizales'::municipality,
   'open'::site_status,
   'Consultar horario del día',
   'https://www.cruzrojacolombiana.org'),

  -- Added on 14 August after checking mapadelterremoto.com for Manizales and
  -- Villamaría (see docs/PLAN.md §9).

  ('shelter'::site_type,
   'Coliseo de la Universidad de Caldas',
   'Habilitado como albergue temporal en la zona del Velódromo Alcides Nieto Patiño.',
   'Universidad de Caldas, Carrera 25A, sector Velódromo',
   st_point(-75.4938881, 5.0556000)::geography,
   'La Estrella', 'manizales'::municipality,
   'open'::site_status,
   'Consultar horario del día',
   'https://www.mapadelterremoto.com'),

  ('shelter'::site_type,
   'Coliseo de Villamaría',
   'Habilitado por la administración municipal para atender a las familias afectadas.',
   'Villamaría, cerca de la Alcaldía municipal',
   st_point(-75.5115, 5.0460)::geography,
   'Villamaría centro', 'villamaria'::municipality,
   'open'::site_status,
   'Consultar horario del día',
   'https://www.mapadelterremoto.com'),

  ('collection_point'::site_type,
   'Banco de Alimentos de Manizales',
   'Recepción de donaciones. Comparte sede con el Banco Arquidiocesano de Alimentos. Dirección exacta pendiente de confirmar por un curador.',
   'Calle 49 #27A-85 (por confirmar)',
   st_point(-75.4990, 5.0660)::geography,
   'Avenida Santander', 'manizales'::municipality,
   'unknown'::site_status,
   null,
   'https://www.mapadelterremoto.com')
) as v(type, name, description, address, location, neighborhood, municipality, status, schedule, source_url);

-- ---------------------------------------------------- neighborhood status --
-- Utility or Alcaldía announcements named these barrios specifically. Rows are
-- short-lived on purpose: no silence is promoted into "normal".

insert into neighborhood_status (
  neighborhood_id,
  evacuated,
  gas_status,
  power_status,
  water_status,
  notes,
  source,
  source_url,
  confirmed_at,
  expires_at
)
select n.id,
       v.evacuated,
       v.gas_status,
       v.power_status,
       v.water_status,
       v.notes,
       v.source,
       v.source_url,
       now(),
       now() + interval '24 hours'
from (values
  ('La Estrella', 'manizales'::municipality, false, 'suspended'::utility_status, 'unknown'::utility_status, 'unknown'::utility_status,
   'Efigas reportó afectación/intermitencia del servicio de gas en el sector.',
   'Caracol Radio / Efigas',
   'https://caracol.com.co/2026/08/11/servicio-de-gas-se-restablece-por-sectores-efigas-envia-recomendaciones-de-seguridad-tras-terremoto/'),
  ('Milán', 'manizales'::municipality, false, 'suspended'::utility_status, 'unknown'::utility_status, 'unknown'::utility_status,
   'Efigas reportó afectación/intermitencia del servicio de gas en el sector.',
   'Caracol Radio / Efigas',
   'https://caracol.com.co/2026/08/11/servicio-de-gas-se-restablece-por-sectores-efigas-envia-recomendaciones-de-seguridad-tras-terremoto/'),
  ('Centro', 'manizales'::municipality, false, 'suspended'::utility_status, 'unknown'::utility_status, 'unknown'::utility_status,
   'Efigas reportó afectación/intermitencia del servicio de gas en la zona centro.',
   'Caracol Radio / Efigas',
   'https://caracol.com.co/2026/08/11/servicio-de-gas-se-restablece-por-sectores-efigas-envia-recomendaciones-de-seguridad-tras-terremoto/')
) as v(neighborhood, municipality, evacuated, gas_status, power_status, water_status, notes, source, source_url)
join neighborhood n
  on n.name = v.neighborhood
 and n.municipality = v.municipality
on conflict (neighborhood_id) do update set
  evacuated = excluded.evacuated,
  gas_status = excluded.gas_status,
  power_status = excluded.power_status,
  water_status = excluded.water_status,
  notes = excluded.notes,
  source = excluded.source,
  source_url = excluded.source_url,
  confirmed_at = excluded.confirmed_at,
  expires_at = excluded.expires_at;

-- ------------------------------------------------------------ site items ---
-- What each collection point wants, and what it explicitly refuses. The
-- refusals are the reason this table exists: the Red Cross has asked publicly
-- that people stop donating used clothing and shoes, and Asocapitales warned
-- against "envíos desarticulados" that don't match identified needs.

insert into site_item (site_id, label, mode, priority)
select s.id, v.label, v.mode, v.priority
from site s
cross join (values
  ('Agua embotellada',                                  'needed'::item_mode,       10),
  ('Alimentos no perecederos (arroz, aceite, granos)',  'needed'::item_mode,        9),
  ('Enlatados con abre-fácil',                          'needed'::item_mode,        8),
  ('Leche en polvo',                                    'needed'::item_mode,        8),
  ('Kits de aseo (jabón, papel higiénico)',             'needed'::item_mode,        7),
  ('Pañales para niños y adultos',                      'needed'::item_mode,        7),
  ('Cobijas, colchonetas y almohadas',                  'needed'::item_mode,        6),
  ('Guantes de construcción, cascos y gafas',           'needed'::item_mode,        6),
  ('Picas y palas',                                     'needed'::item_mode,        5),
  ('Ropa y zapatos usados',                             'not_accepted'::item_mode,  0),
  ('Alimentos perecederos o próximos a vencer',         'not_accepted'::item_mode,  0),
  ('Medicamentos',                                      'not_accepted'::item_mode,  0)
) as v(label, mode, priority)
where s.type = 'collection_point';

insert into site_item (site_id, label, mode, priority)
select s.id, v.label, v.mode, v.priority
from site s
cross join (values
  ('Sangre tipo O negativo', 'needed'::item_mode, 10),
  ('Sangre tipo O positivo', 'needed'::item_mode, 10)
) as v(label, mode, priority)
where s.type = 'blood_donation';

insert into site_item (site_id, label, mode, priority)
select s.id, v.label, v.mode, v.priority
from site s
cross join (values
  ('Alimento para perros y gatos', 'needed'::item_mode,      8),
  ('Cobijas y colchonetas',        'needed'::item_mode,      7),
  ('Ropa y zapatos usados',        'not_accepted'::item_mode, 0)
) as v(label, mode, priority)
where s.type = 'shelter';
