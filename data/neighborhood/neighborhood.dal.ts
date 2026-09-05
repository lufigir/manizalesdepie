import "server-only";

import { neighborhoods } from "@/lib/demo/dataset";

import { neighborhoodSchema, type NeighborhoodDTO } from "./neighborhood.dto";

/**
 * The only path from this application to the barrios.
 *
 * Read-only, and it shows: there is one factory and it is `public()`. The
 * barrios are the Alcaldía's official layer, published as open data, and the
 * app never writes to them — so an authenticated context would be a door with
 * nothing behind it.
 */
export class NeighborhoodDAL {
  private constructor() {}

  static public(): NeighborhoodDAL {
    return new NeighborhoodDAL();
  }

  /**
   * Every barrio and sector with a coordinate, alphabetically.
   *
   * Alphabetical because the picker is searched, not browsed: the order only
   * has to be predictable enough that the same query always lands the same
   * result in the same place. It also means a sector and its parent barrio
   * land apart in the list rather than next to each other — "Topacio" is
   * nowhere near "Morrogacho" alphabetically — so it is the "dentro de X"
   * line (`parentName`), not the ordering, that has to carry the relationship
   * between the two.
   *
   * 292 rows of six short fields — on the order of ten kilobytes on the
   * wire. That is still well under the 149 KB of `public/barrios.geojson`'s
   * 114 polygons, and the comparison is more one-sided than it looks: the
   * geojson carries polygons for the barrios only and has no sector rows in
   * it at all, so it could not serve this picker even at its own size.
   */
  async list(): Promise<NeighborhoodDTO[]> {
    return neighborhoods().map((row) =>
      neighborhoodSchema.parse({
        id: row.id,
        name: row.name,
        municipality: row.municipality,
        longitude: row.longitude,
        latitude: row.latitude,
        parentName: row.parentName,
      }),
    );
  }
}
