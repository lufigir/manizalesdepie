/**
 * Imports emergency-serving places from OpenStreetMap into `sites`.
 *
 * Run by hand: `node --env-file=.env.local scripts/import-osm-sites.mjs`
 *
 * Why this exists: every coordinate in the seed was wrong by 0.9–7.8 km,
 * because they were guessed from a sector name. OSM POIs come with coordinates
 * that are already correct, which is the one thing geocoding a Colombian
 * informal address cannot give us.
 *
 * ARCHITECTURE NOTE. This talks to Postgres without going through `data/`,
 * which the project's dependency rule otherwise forbids. It is a deliberate
 * exception: a one-off loading script is not application code, no request ever
 * reaches it, and routing it through a DAL would mean inventing a bulk-import
 * method that nothing else needs. If this ever becomes a scheduled job it
 * should move behind a DAL.
 *
 * Scope is narrow on purpose. Only the categories that answer "where do I get
 * or give help": hospitals and clinics. Vets and drinking-water taps were
 * dropped along with `vet_clinic`/`water_point` — the map stopped drawing
 * either, and importing rows into types nobody offers or accepts any more
 * would just be dead data. Pharmacies and supermarkets were left out for the
 * same underlying reason — AGENTS.md is explicit that this is not a
 * directory, and hundreds of pins nobody reported would bury the ones somebody
 * did.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY. Corre con: node --env-file=.env.local",
  );
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const OVERPASS = "https://overpass-api.de/api/interpreter";
const UA = "manizales-de-pie/1.0 (https://manizales-de-pie.vercel.app)";

const QUERY = `
[out:json][timeout:180];
(
  area["name"="Manizales"]["boundary"="administrative"]["admin_level"="6"];
  area["name"="Villamaría"]["boundary"="administrative"]["admin_level"="6"];
)->.a;
(
  nwr(area.a)["amenity"~"^(hospital|clinic|doctors)$"];
);
out center tags;
`;

/** OSM tag -> our site_type. Anything unmapped is dropped rather than guessed. */
function siteType(tags) {
  switch (tags.amenity) {
    case "hospital":
    case "clinic":
    case "doctors":
      return "medical_post";
    default:
      return null;
  }
}

/** Metres between two lon/lat pairs. Good enough at city scale. */
function metres(aLon, aLat, bLon, bLat) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat = ((aLat + bLat) / 2) * (Math.PI / 180);
  return Math.hypot(dLon * Math.cos(lat), dLat) * R;
}

const response = await fetch(OVERPASS, {
  method: "POST",
  headers: { "User-Agent": UA },
  body: new URLSearchParams({ data: QUERY }),
});

if (!response.ok) throw new Error(`Overpass respondió ${response.status}`);

const { elements } = await response.json();

const candidates = elements
  .map((el) => {
    const tags = el.tags ?? {};
    const type = siteType(tags);
    const lon = el.lon ?? el.center?.lon;
    const lat = el.lat ?? el.center?.lat;

    // "Hospital" alone tells nobody where to go, so an unnamed one is
    // unusable.
    const name = tags.name ?? null;

    if (!type || !name || lon == null || lat == null) return null;

    return {
      type,
      name,
      address: tags["addr:full"] ?? tags["addr:street"] ?? null,
      lon,
      lat,
      // Written so a curator can check the claim against its source, which is
      // what the verified badge is supposed to mean.
      source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    };
  })
  .filter(Boolean);

// Existing rows, to avoid planting a second pin on top of one already there.
const { data: existing, error: readError } = await supabase
  .from("sites_public")
  .select("name, longitude, latitude");

if (readError) throw new Error(`No se pudo leer sites_public: ${readError.message}`);

const kept = [];
for (const c of candidates) {
  const clash = existing.some(
    (e) => metres(c.lon, c.lat, e.longitude, e.latitude) < 80,
  );
  // Also guards against Overpass returning the same place as node and way.
  const dupe = kept.some((k) => metres(c.lon, c.lat, k.lon, k.lat) < 60);
  if (!clash && !dupe) kept.push(c);
}

const rows = kept.map((c) => ({
  type: c.type,
  name: c.name,
  address: c.address,
  location: `SRID=4326;POINT(${c.lon} ${c.lat})`,
  // 'unknown', never 'open'. OSM knows the building is there; it knows nothing
  // about whether it is receiving people three days after an earthquake. The
  // map says so rather than implying a status nobody checked.
  status: "unknown",
  source_url: c.source_url,
  published: true,
  expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
}));

if (rows.length === 0) {
  console.log("Nada nuevo que importar.");
  process.exit(0);
}

const { error: writeError } = await supabase.from("sites").insert(rows);
if (writeError) throw new Error(`Fallo al insertar: ${writeError.message}`);

const byType = rows.reduce((acc, r) => {
  acc[r.type] = (acc[r.type] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `${candidates.length} candidatos · ${candidates.length - kept.length} descartados por cercanía · ${rows.length} importados`,
);
for (const [type, count] of Object.entries(byType)) {
  console.log(`  ${count.toString().padStart(3)}  ${type}`);
}
