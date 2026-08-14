/**
 * Point-in-polygon, by ray casting.
 *
 * Done in the browser rather than in PostGIS because the polygons are already
 * loaded to draw the outlines, and the alternative is a round trip per hover.
 * The numbers involved are small — ~140 barrios tested once per map move — so
 * the naive algorithm is the right one.
 *
 * The test counts how many times a ray cast east from the point crosses the
 * ring: an odd count means inside. Points exactly on an edge are undefined by
 * this method and that is fine here; a point sitting on a barrio border being
 * attributed to either neighbour changes nothing anyone acts on.
 */

type Ring = [number, number][];

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const straddles = yi > lat !== yj > lat;
    if (!straddles) continue;

    // Longitude where edge j→i crosses this latitude.
    const crossing = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (lon < crossing) inside = !inside;
  }

  return inside;
}

type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

/** Whether a point falls inside a GeoJSON Polygon or MultiPolygon. Only outer
 *  rings are considered; the barrio boundaries carry no holes. */
export function contains(
  geometry: Geometry,
  lon: number,
  lat: number,
): boolean {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.some((rings) => rings.length > 0 && inRing(lon, lat, rings[0]));
}
