import "server-only";

import { neighborhoodAt } from "@/lib/demo/dataset";

/**
 * Which barrio a coordinate falls in, or null outside every polygon we hold —
 * the whole of Villamaría, among other places.
 *
 * A plain function rather than the class-with-private-constructor shape every
 * other DAL here takes, and the reason is the shape's own reason: the private
 * constructor exists so an instance cannot exist without a resolved
 * authorization context. There is nothing to authorize here. The barrio
 * polygons are public reference data — the same shapes the browser downloads
 * as `public/barrios.geojson` to draw the outlines — and this returns one
 * barrio about a point the caller already has.
 *
 * It lives in a `.dal.ts` file because it reads the data source, and that is
 * the boundary `eslint.config.mjs` enforces: `@/lib/demo/*` is importable
 * from here and from nowhere else in `data/`. It used to be PostGIS behind
 * this signature — `neighborhood_at`, the same function the insert triggers
 * called — which is why the answer was always the database's to give and
 * never the caller's to send.
 */
export function resolveNeighborhood(
  longitude: number,
  latitude: number,
): { id: string; name: string } | null {
  return neighborhoodAt(longitude, latitude);
}
