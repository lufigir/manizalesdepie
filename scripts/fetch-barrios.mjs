/**
 * Builds public/barrios.geojson from the Alcaldía's own GIS.
 *
 * Run by hand, output committed: `node scripts/fetch-barrios.mjs`
 *
 * The source is the official one: "Límite de barrios Municipio de Manizales",
 * published by SIG Alcaldía de Manizales on its ArcGIS open-data portal, 116
 * polygons carrying the barrio name and its comuna. The division itself is
 * Acuerdo Municipal 589 de 2004, amended by 1038 de 2019 for Ciudadela del
 * Norte. These are real administered borders, not an approximation.
 *
 * That is worth stating because the obvious assumption is wrong. OSM carries
 * ~140 barrios of Manizales as NAMED POINTS and zero areas, so the first
 * version of this script derived the shapes as a Voronoi over those points. It
 * was thrown away the moment this dataset turned up: a synthetic border that
 * looks authoritative is worse than no border, and nobody should rebuild it.
 *
 * Why a build-time script and a static file, rather than a table:
 *   - Drawing an outline needs no database. Shipping the rings as a static
 *     asset keeps the map off a third-party service at request time, which
 *     matters because this is an emergency map.
 *   - Barrio borders do not move. Perishable data belongs in Postgres; this is
 *     the opposite of perishable.
 *
 * Villamaría is not in here. This is a Manizales municipal dataset and their
 * SIG publishes no equivalent, so the map reports no barrio across the river.
 * Saying nothing is right; guessing a name there would not be.
 */

import { readFile, writeFile } from "node:fs/promises";

/** The FeatureServer behind the portal page. `outSR=4326` matters: the service
 *  stores the city in a projected CRS and would otherwise hand back metres. */
const ARCGIS =
  "https://sig.manizales.gov.co/wadmzl/rest/services/20_WEB/2021_consulta_catas_urbano_web/FeatureServer/1/query" +
  "?where=1%3D1&outFields=BARRIOS,Id_Comuna&returnGeometry=true&outSR=4326&f=geojson";

/**
 * Overpass, used for one thing only: spelling.
 *
 * The official dataset writes every name in unaccented capitals — "SAN JOSE",
 * "COLON" — and this interface is read by people in Spanish. OSM has the same
 * barrios written properly, so names are matched on a normalised key and the
 * accented spelling wins. Anything without a match falls back to title case,
 * which loses an accent but never invents a name.
 */
const OVERPASS_MIRRORS = [
  // kumi first by measurement: the main instance answered 504 for this query
  // repeatedly while this one served it in ~12s.
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const OVERPASS_QUERY = `
[out:json][timeout:120];
area["name"="Manizales"]["boundary"="administrative"]->.a;
node(area.a)["place"~"^(neighbourhood|suburb|quarter)$"]["name"];
out tags center;
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Accent- and case-insensitive key, so "SAN JOSE" finds "San José". */
const key = (name) =>
  name
    .normalize("NFD")
    // Strips the combining marks NFD just split off, so "José" keys as "JOSE".
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/** Title case with the Spanish connectives left lowercase. Only used when OSM
 *  has no spelling for a barrio. */
const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);
function titleCase(name) {
  return name
    // "PUERTA DEL SOL(Corinto)" arrives with the bracket glued to the name.
    .replace(/\(/g, " (")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : // Capitalise the first letter, skipping an opening bracket so
          // "(corinto)" comes out as "(Corinto)".
          word.replace(/[a-záéíóúñ]/, (letter) => letter.toUpperCase()),
    )
    .join(" ");
}

/**
 * Ramer–Douglas–Peucker. The raw rings carry far more detail than a shape drawn
 * a few hundred pixels wide can show, and every point is bytes over a damaged
 * network.
 */
function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const [start] = points;
  const end = points[points.length - 1];

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicular(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [start, end];

  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function perpendicular(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy));
}

/**
 * ~1 m at this latitude for the rounding, and a tolerance well below a city
 * block for the simplification. Barrios are much smaller than comunas, so this
 * is finer than fetch-comunas.mjs uses: at the comuna tolerance the small
 * central barrios collapsed into triangles.
 */
const round = (ring) =>
  ring.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]);

const tidy = (ring) => {
  // A ring that is already tiny — Puerta del Sol has a four-point sliver — can
  // simplify down to a degenerate line and vanish. Keep the original when that
  // happens: a small barrio disappearing is exactly the failure nobody notices.
  const simplified = round(simplify(ring, 0.00004));
  const out = simplified.length >= 4 ? simplified : round(ring);

  // Force closure. A hairline gap would render as a torn shape.
  const head = out[0];
  const tail = out[out.length - 1];
  if (head[0] !== tail[0] || head[1] !== tail[1]) out.push(head);

  return out;
};

/**
 * Where to write the barrio's name on the map.
 *
 * The area-weighted centroid of the biggest ring. Not the average of the
 * vertices — that pulls towards whichever edge has the most detail — and not
 * the bounding-box centre, which lands outside anything L-shaped. For barrios,
 * which are compact by construction, this is close enough to the visual middle
 * and costs no dependency.
 */
function centroid(polygons) {
  const ring = polygons
    .map(([outer]) => outer)
    .reduce((biggest, candidate) =>
      candidate.length > biggest.length ? candidate : biggest,
    );

  let area = 0;
  let x = 0;
  let y = 0;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    area += cross;
    x += (ring[j][0] + ring[i][0]) * cross;
    y += (ring[j][1] + ring[i][1]) * cross;
  }

  // A degenerate ring has zero area; fall back to its first vertex rather than
  // dividing by zero and writing the label at NaN.
  if (area === 0) return { lon: ring[0][0], lat: ring[0][1] };

  return {
    lon: Number((x / (3 * area)).toFixed(5)),
    lat: Number((y / (3 * area)).toFixed(5)),
  };
}

async function fetchSpellings() {
  for (const [attempt, endpoint] of OVERPASS_MIRRORS.entries()) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          // Overpass asks that clients identify themselves; anonymous bulk
          // callers get throttled first when the service is busy.
          "User-Agent":
            "manizales-de-pie/1.0 (https://manizales-de-pie.vercel.app)",
        },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
      });

      if (!response.ok) throw new Error(`respondió ${response.status}`);

      const { elements } = await response.json();
      const spellings = new Map();
      for (const el of elements) {
        const name = el.tags?.name?.trim();
        if (name) spellings.set(key(name), name);
      }
      return spellings;
    } catch (cause) {
      console.warn(`  ortografía: ${new URL(endpoint).host} ${cause.message}`);
      await sleep(2000 * (attempt + 1));
    }
  }

  // Not fatal. The borders are the point; the accents are a courtesy.
  console.warn("  ortografía: sin Overpass, se usa lo ya escrito");
  return new Map();
}

/**
 * The spellings this script has already resolved, read back from its own
 * output.
 *
 * Overpass fails intermittently — often enough that two runs an hour apart gave
 * 97 accented names and then zero. Without this, a failed run would silently
 * overwrite good names with "San Jose" and nobody would notice until it was on
 * screen. The committed file is the cache.
 */
async function cachedSpellings() {
  try {
    const previous = JSON.parse(await readFile("public/barrios.geojson", "utf8"));
    return new Map(
      previous.features.map((f) => [key(f.properties.name), f.properties.name]),
    );
  } catch {
    return new Map();
  }
}

const response = await fetch(ARCGIS, {
  headers: { "User-Agent": "manizales-de-pie/1.0" },
});
if (!response.ok) {
  throw new Error(`SIG Manizales respondió ${response.status}`);
}

const source = await response.json();
if (!Array.isArray(source.features) || source.features.length === 0) {
  throw new Error("El servicio no devolvió barrios; ¿cambió la capa?");
}

// Live OSM wins; what a previous run already resolved fills the gaps; title
// case is the floor. Accents are never lost by a bad afternoon on Overpass.
const spellings = new Map([
  ...(await cachedSpellings()),
  ...(await fetchSpellings()),
]);

let renamed = 0;

/**
 * One feature per barrio, not per row.
 *
 * The dataset splits a barrio that is not contiguous into several rows with the
 * same name — Puerta del Sol (Corinto) is three. Left as separate features they
 * highlight separately under the cursor and read as three different places with
 * one name, so the parts are merged into a MultiPolygon.
 *
 * The name is also the id. OBJECTID would be stable too, but the barrio has to
 * survive being merged, and MapGeoJSON's promoteId needs one key per feature.
 */
const byBarrio = new Map();

for (const feature of source.features) {
  const raw = feature.properties?.BARRIOS?.trim();
  if (!raw || !feature.geometry) continue;

  const id = key(raw);
  let entry = byBarrio.get(id);

  if (!entry) {
    const spelled = spellings.get(id);
    if (spelled) renamed += 1;
    entry = {
      id,
      name: spelled ?? titleCase(raw),
      // Kept because the comuna is the honest unit for anything that counts,
      // and this is the only place the two arrive already joined.
      comuna: feature.properties.Id_Comuna ?? null,
      polygons: [],
    };
    byBarrio.set(id, entry);
  }

  const rings =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

  for (const polygon of rings) {
    // Outer rings only. The dataset carries no holes, and lib/geo.ts ignores
    // them anyway, so keeping them would only cost bytes.
    const outer = tidy(polygon[0]);
    if (outer.length >= 4) entry.polygons.push([outer]);
  }
}

const features = [...byBarrio.values()]
  .filter((entry) => entry.polygons.length > 0)
  .map((entry) => ({
    type: "Feature",
    id: entry.id,
    properties: {
      id: entry.id,
      name: entry.name,
      comuna: entry.comuna,
      // Where the label goes, precomputed so the browser does not do this for
      // 114 polygons on every render.
      ...centroid(entry.polygons),
    },
    geometry:
      entry.polygons.length === 1
        ? { type: "Polygon", coordinates: entry.polygons[0] }
        : { type: "MultiPolygon", coordinates: entry.polygons },
  }))
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "es"));

const collection = { type: "FeatureCollection", features };
const json = JSON.stringify(collection);

await writeFile("public/barrios.geojson", json);

/**
 * The same shapes, as an idempotent upsert into `neighborhood`.
 *
 * Not a migration: a migration runs once, so editing it after the Alcaldía
 * updates the layer would change nothing in a database that already applied it.
 * This file is meant to be re-run.
 *
 *   npx supabase db execute --file supabase/barrios.sql
 *
 * Matching is on (name, municipality), the unique key the table already had, so
 * the nine hand-entered rows are updated in place rather than duplicated.
 */
const sql = [
  "-- GENERATED by scripts/fetch-barrios.mjs — do not edit by hand.",
  "-- Source: SIG Alcaldía de Manizales, capa \"Límite de barrios\"",
  "-- (Acuerdo Municipal 589 de 2004). Re-run the script to refresh.",
  "--",
  "--   npx supabase db execute --file supabase/barrios.sql",
  "",
  "begin;",
  "",
  ...features.map((feature) => {
    const geojson = JSON.stringify(feature.geometry).replaceAll("'", "''");
    const name = feature.properties.name.replaceAll("'", "''");
    const comuna = feature.properties.comuna
      ? `'${feature.properties.comuna}'`
      : "null";

    // The geometry is written once and the centroid derived from it, rather
    // than pasting the same polygon twice: at 114 barrios the second copy cost
    // more than half the file.
    return (
      `with shape as (select st_multi(st_geomfromgeojson('${geojson}')) as g)\n` +
      `insert into neighborhood (name, municipality, comuna, boundary, centroid)\n` +
      `select '${name}', 'manizales', ${comuna}, g::geography, st_centroid(g)::geography\n` +
      `from shape\n` +
      `on conflict (name, municipality) do update set\n` +
      `  comuna = excluded.comuna,\n` +
      `  boundary = excluded.boundary,\n` +
      `  centroid = excluded.centroid;`
    );
  }),
  "",
  "-- Existing rows predate the trigger, so they are stamped here. Anything",
  "-- outside the polygons keeps a null barrio, which is the honest answer.",
  "update site set neighborhood_id = neighborhood_at(",
  "  st_x(location::geometry), st_y(location::geometry))",
  "where location is not null;",
  "",
  "commit;",
  "",
].join("\n");

await writeFile("supabase/barrios.sql", sql);

const points = features.reduce((total, f) => {
  const rings =
    f.geometry.type === "Polygon"
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat();
  return total + rings.reduce((n, ring) => n + ring.length, 0);
}, 0);

console.log(
  `${features.length} barrios · ${points} puntos · ${(json.length / 1024).toFixed(1)} KB · ` +
    `${renamed} nombres con ortografía de OSM o de la corrida anterior`,
);
console.log(
  "escritos public/barrios.geojson y supabase/barrios.sql\n" +
    "  aplica el segundo con: npx supabase db execute --file supabase/barrios.sql",
);
