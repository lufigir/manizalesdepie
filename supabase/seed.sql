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

insert into neighborhood (name, municipality, centroid) values
  ('Centro',            'manizales',  st_point(-75.5174, 5.0689)::geography),
  ('Chipre',            'manizales',  st_point(-75.5253, 5.0733)::geography),
  ('Avenida Santander', 'manizales',  st_point(-75.4990, 5.0660)::geography),
  ('El Cable',          'manizales',  st_point(-75.4936, 5.0655)::geography),
  ('Palogrande',        'manizales',  st_point(-75.4934, 5.0648)::geography),
  ('Milán',             'manizales',  st_point(-75.4790, 5.0575)::geography),
  ('Los Naranjos',      'manizales',  st_point(-75.4835, 5.0602)::geography),
  ('Aranjuez',          'manizales',  st_point(-75.4880, 5.0480)::geography),
  ('Villamaría centro', 'villamaria', st_point(-75.5133, 5.0447)::geography);

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
   'https://www.cruzrojacolombiana.org')
) as v(type, name, description, address, location, neighborhood, municipality, status, schedule, source_url);

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

-- ----------------------------------------------------------- closed roads --
-- Curated by hand: the INVIAS API serves the road network, while the daily
-- landslide bulletins are published only as PDF.

insert into closed_road (name, segment, marker, status, cause, source, published, expires_at) values
  ('Manizales – Fresno',      'Sector Alto de Letras',       st_point(-75.3200, 4.9800)::geography, 'fully_closed',    'Deslizamientos y caída de rocas',        'INVIAS / prensa', false, now() + interval '48 hours'),
  ('Manizales – Bogotá',      'Sector Letras',               st_point(-75.3300, 4.9750)::geography, 'fully_closed',    'Afectación crítica por el sismo',        'INVIAS / prensa', false, now() + interval '48 hours'),
  ('Pereira – Chinchiná',     'Kilómetros 22 a 24',          st_point(-75.6300, 4.9800)::geography, 'fully_closed',    'Deslizamiento',                          'INVIAS / prensa', false, now() + interval '48 hours'),
  ('Manzanares – Marulanda',  'Vía completa',                st_point(-75.1500, 5.2500)::geography, 'fully_closed',    'Derrumbe; afecta transporte agrícola',   'INVIAS / prensa', false, now() + interval '48 hours'),
  ('Manizales – Neira',       'Sector El Naranjal',          st_point(-75.5200, 5.1200)::geography, 'partially_open',  'Derrumbe; paso parcial habilitado',      'INVIAS / prensa', false, now() + interval '48 hours');
