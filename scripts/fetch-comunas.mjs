/**
 * Builds public/comunas.geojson from OpenStreetMap.
 *
 * Run by hand, output committed: `node scripts/fetch-comunas.mjs`
 *
 * Why a build-time script and a static file, rather than a table:
 *   - Drawing an outline needs no database. Shipping the rings as a static
 *     asset keeps the map off Overpass at request time, which matters because
 *     Overpass is a volunteer-run service with no uptime promise and this is an
 *     emergency map.
 *   - Comuna borders do not move. Perishable data belongs in Postgres; this is
 *     the opposite of perishable.
 *
 * OSM carries only these 12 comunas plus the rural corregimientos, as
 * admin_level=8 relations — no barrio areas at all.
 *
 * This file used to claim barrio polygons did not exist anywhere. That was
 * wrong: the Alcaldía's own GIS publishes them, and `fetch-barrios.mjs` now
 * uses that. Comunas stay because they are the unit anything countable
 * aggregates to, and the map still needs them for the unmet-need choropleth.
 */

const OVERPASS = "https://overpass-api.de/api/interpreter";

const QUERY = `
[out:json][timeout:120];
area["name"="Manizales"]["boundary"="administrative"]->.a;
relation(area.a)["boundary"="administrative"]["admin_level"="8"];
out geom;
`;

/**
 * OSM stores a boundary as a bag of unordered, arbitrarily-directed ways. This
 * chains them end to end into closed rings, flipping any way that runs
 * backwards. Without it the polygons render as spaghetti.
 */
function assembleRings(ways) {
  const pending = ways.map((way) => way.map((p) => [p.lon, p.lat]));
  const rings = [];

  while (pending.length > 0) {
    let ring = pending.shift();

    let joined = true;
    while (joined) {
      joined = false;
      const head = ring[0];
      const tail = ring[ring.length - 1];
      // A closed ring is done; stop trying to extend it.
      if (head[0] === tail[0] && head[1] === tail[1]) break;

      for (let i = 0; i < pending.length; i++) {
        const candidate = pending[i];
        const cHead = candidate[0];
        const cTail = candidate[candidate.length - 1];

        if (cHead[0] === tail[0] && cHead[1] === tail[1]) {
          ring = ring.concat(candidate.slice(1));
        } else if (cTail[0] === tail[0] && cTail[1] === tail[1]) {
          ring = ring.concat(candidate.slice(0, -1).reverse());
        } else if (cTail[0] === head[0] && cTail[1] === head[1]) {
          ring = candidate.slice(0, -1).concat(ring);
        } else if (cHead[0] === head[0] && cHead[1] === head[1]) {
          ring = candidate.slice(1).reverse().concat(ring);
        } else {
          continue;
        }

        pending.splice(i, 1);
        joined = true;
        break;
      }
    }

    // Force closure. A hairline gap in OSM data would otherwise produce an
    // invalid polygon that MapLibre renders as a torn shape.
    const head = ring[0];
    const tail = ring[ring.length - 1];
    if (head[0] !== tail[0] || head[1] !== tail[1]) ring.push(head);

    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

/**
 * Ramer–Douglas–Peucker. The raw rings carry ~6,500 points for a shape that is
 * drawn a few hundred pixels wide; the detail is invisible and every point is
 * bytes over a damaged network.
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

const round = (ring) =>
  // ~1 m at this latitude. Anything finer is noise for a city-scale shape.
  ring.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]);

// URLSearchParams sets application/x-www-form-urlencoded. A bare string body
// would go out as text/plain, which Overpass answers with 406.
const response = await fetch(OVERPASS, {
  method: "POST",
  headers: {
    // Overpass asks that clients identify themselves; anonymous bulk callers
    // get throttled first when the service is busy.
    "User-Agent": "manizales-de-pie/1.0 (https://manizales-de-pie.vercel.app)",
  },
  body: new URLSearchParams({ data: QUERY }),
});
if (!response.ok) {
  throw new Error(`Overpass respondió ${response.status}`);
}

const { elements } = await response.json();

const features = elements
  .filter((el) => el.tags?.name)
  .map((el) => {
    const outer = (el.members ?? [])
      .filter((m) => m.type === "way" && m.role !== "inner" && m.geometry)
      .map((m) => m.geometry);

    const rings = assembleRings(outer)
      .map((ring) => round(simplify(ring, 0.00012)))
      .filter((ring) => ring.length >= 4);

    if (rings.length === 0) return null;

    return {
      type: "Feature",
      // promoteId in MapGeoJSON needs a stable key for hover feature-state.
      id: el.id,
      properties: {
        id: el.id,
        name: el.tags.name,
        // The rural corregimientos are not "Comuna X"; the map filters on this.
        urban: el.tags.name.startsWith("Comuna"),
      },
      geometry:
        rings.length === 1
          ? { type: "Polygon", coordinates: rings }
          : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "es"));

const collection = { type: "FeatureCollection", features };
const json = JSON.stringify(collection);

const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir("public", { recursive: true });
await writeFile("public/comunas.geojson", json);

const points = features.reduce((total, f) => {
  const rings =
    f.geometry.type === "Polygon"
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat();
  return total + rings.reduce((n, ring) => n + ring.length, 0);
}, 0);

console.log(
  `${features.length} áreas · ${points} puntos · ${(json.length / 1024).toFixed(1)} KB`,
);
for (const f of features) {
  console.log(`  ${f.properties.urban ? "urbana" : "rural "}  ${f.properties.name}`);
}
