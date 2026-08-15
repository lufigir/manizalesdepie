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

-- ------------------------------------------------------------ work orders --
-- Individual household requests, reported the 14th and 15th of August on
-- mapa-necesidades.site — an independent, unaffiliated community mapping
-- effort for the same earthquake (see its own footer: "plataforma solidaria
-- y apolítica"). Pulled by hand, not by a script, and narrowed to two days on
-- purpose: the 73 sectors that platform carries span a much wider window,
-- and importing all of it at once is a curation job, not a seed.
--
-- One row from that source (a "Viviendas afectadas" entry in La Unión,
-- Valle del Cauca — 150 km away, well outside `CITY_BOUNDS`) is left out
-- entirely: it was tagged `ciudad=manizales` in their data but is not this
-- city, and `createWorkOrderSchema`'s own out-of-area rule would reject it
-- if it ever reached the form.
--
-- Same privacy split as everywhere else in this file: the reporter's name
-- and phone go only into `work_order_contact`, never into the public row.
-- `approx_location` is rounded to three decimal places (~100 m) rather than
-- the source's original precision, which sat close enough to a real
-- household to be an address in practice — the whole reason
-- `work_order.approx_location` exists is to never publish that.
--
-- published = false, same as every other row in this file: this is a
-- crowdsourced report from a platform we do not run, and a curator has to
-- read it before it reaches the public map.

insert into work_order (id, category, description, approx_location, status, published, confirmed_at)
select v.id, v.category, v.description, st_point(v.lng, v.lat)::geography, 'unclaimed', false, now()
from (values
  ('c793b455-cde0-4506-814b-217fb0982c16'::uuid, 'supplies'::work_order_category,
   'Se necesitan herramientas de corte: un disco de corte para metal (4 pulgadas), uno para madera y dos cajas de puntilla de 1/2 pulgada. Sector La Linda.',
   -75.546, 5.092),
  ('d23eb76d-f837-4506-bf33-305b56e201e1'::uuid, 'animal_rescue'::work_order_category,
   'Refugio de animales con 92 perros, 4 gatos y una pareja de adultos a cargo: se necesita alimento y medicamentos veterinarios, elementos de aseo y mercado. Sector El Arenillo.',
   -75.537, 5.064),
  ('a7f91c85-d321-490f-a937-65a788dae202'::uuid, 'structural_risk'::work_order_category,
   'Familia de bajos recursos con la vivienda muy afectada: se necesita gravilla, cemento, láminas, tejas y otros materiales para reconstruir. Sector Alto Persia.',
   -75.503, 5.059),
  ('8fdd8c69-bf33-4911-9298-4670a87c49f9'::uuid, 'other'::work_order_category,
   'Bomberos voluntarios del sector Fundadores piden apoyo con combustible para los vehículos de ayuda que circulan por la ciudad.',
   -75.510, 5.069),
  ('75909d60-577b-445a-93ad-ecc991d908f8'::uuid, 'supplies'::work_order_category,
   'Varias familias del sector El Nevado necesitan comida, agua potable y alojamiento temporal; quien reporta indica que hay más familias en la misma situación.',
   -75.514, 5.060),
  ('88542281-0df7-420a-aeee-3b5a2db7a769'::uuid, 'other'::work_order_category,
   'Persona desalojada de su vivienda tras el sismo. Sector El Nevado.',
   -75.514, 5.060),
  ('3f735f74-39ee-49d8-9f6f-eedebc6f4eb7'::uuid, 'animal_rescue'::work_order_category,
   'Refugio de mascotas con 48 perros y 20 gatos: se necesita ayuda para poner tejas en el techo y trasladar escombros del lugar. Centro de Villamaría.',
   -75.514, 5.046),
  ('d0bc5ff3-3f7d-4596-ac65-5973beaf8bc4'::uuid, 'supplies'::work_order_category,
   'Familia de escasos recursos con varios niños, cerca de la calle 16 con 17, requiere alimentos. Sector Los Agustinos.',
   -75.522, 5.071),
  ('5d9b15a7-3916-4cd5-bd4a-182d2be76c04'::uuid, 'supplies'::work_order_category,
   'Un joven (talla M, pantalón 34, zapatos 39) y su hija de 5 a 6 años lo perdieron todo: se necesita ropa de esas tallas, implementos de aseo y mercado. Sector Enea.',
   -75.516, 5.062),
  ('2b44a0e9-e784-4556-bbac-f6080b7a62b4'::uuid, 'structural_risk'::work_order_category,
   'Vivienda cerca de la carrera 29 #38-18, barrio Villanueva, necesita materiales para reconstruir.',
   -75.508, 5.061),
  ('34d2a43f-98a9-46dd-8243-130df442b65a'::uuid, 'structural_risk'::work_order_category,
   'Se requieren lonas para cubrir casas dañadas y evitar robos de lo poco que quedó. Barrio Galán.',
   -75.512, 5.078)
) as v(id, category, description, lng, lat);

insert into work_order_contact (work_order_id, exact_address, contact_name, phone, notes)
values
  ('c793b455-cde0-4506-814b-217fb0982c16', 'Sector La Linda, Manizales (dirección exacta por confirmar)',
   'Guadalupe Nieto M', '3246219748', null),
  ('d23eb76d-f837-4506-bf33-305b56e201e1', 'Sector El Arenillo, Manizales (dirección exacta por confirmar)',
   'Lucia Cuervo — Fundación Ángeles de la Calle', '3176560345', null),
  ('a7f91c85-d321-490f-a937-65a788dae202', 'Sector Alto Persia, Manizales (dirección exacta por confirmar)',
   'Mayerly Granada', '3107083713', null),
  ('8fdd8c69-bf33-4911-9298-4670a87c49f9', 'Bomberos Voluntarios Fundadores, Manizales',
   'Jairo López — Ministerio del Interior', '3154195166', 'Prioridad alta.'),
  ('75909d60-577b-445a-93ad-ecc991d908f8', 'Sector El Nevado, Manizales (dirección exacta por confirmar)',
   'Alejo', '642933789',
   'Prioridad alta. El teléfono reportado (642933789) no tiene el formato celular colombiano habitual; verificar antes de contactar.'),
  ('88542281-0df7-420a-aeee-3b5a2db7a769', 'Sector El Nevado, Manizales (dirección exacta por confirmar)',
   'Mónica Arenas Montes', '3215182803', null),
  ('3f735f74-39ee-49d8-9f6f-eedebc6f4eb7', 'Centro de Villamaría (dirección exacta por confirmar)',
   'Leidy Ortiz Ocampo — líder del refugio', '3022060845', null),
  ('d0bc5ff3-3f7d-4596-ac65-5973beaf8bc4', 'Calle 16 con carrera 17, sector Los Agustinos, Manizales',
   'Olga Uribe', '3003544440', 'Prioridad alta.'),
  ('5d9b15a7-3916-4cd5-bd4a-182d2be76c04', 'Sector Enea, Manizales (dirección exacta por confirmar)',
   'Manuela Duque', '3183049437', 'Prioridad alta.'),
  ('2b44a0e9-e784-4556-bbac-f6080b7a62b4', 'Carrera 29 #38-18, barrio Villanueva, Manizales',
   'Banny Jaramillo', '3103612586', 'Prioridad alta.'),
  ('34d2a43f-98a9-46dd-8243-130df442b65a', 'Barrio Galán, Manizales (dirección exacta por confirmar)',
   'Santiago Alzate', '3122335959', 'Prioridad alta.');
