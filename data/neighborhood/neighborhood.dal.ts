import "server-only";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  neighborhoodSchema,
  type NeighborhoodDTO,
} from "./neighborhood.dto";

/**
 * The only path from this application to `neighborhood`.
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
   * Every barrio with a coordinate, alphabetically.
   *
   * Alphabetical because the picker is searched, not browsed: the order only
   * has to be predictable enough that the same query always lands the same
   * result in the same place.
   *
   * 118 rows of five short fields — about four kilobytes on the wire. That is
   * why the form reads this instead of `public/barrios.geojson`, which carries
   * 114 polygons at 149 KB and would be paid for on a route that draws no
   * polygons at all.
   */
  async list(): Promise<NeighborhoodDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("neighborhood_public")
      .select("id, name, municipality, longitude, latitude")
      .order("name");

    if (error) {
      log.error("neighborhood.list failed", { code: error.code });
      throw new Error("No se pudieron cargar los barrios");
    }

    return (data ?? []).map((row) =>
      neighborhoodSchema.parse({
        id: row.id,
        name: row.name,
        municipality: row.municipality,
        longitude: row.longitude,
        latitude: row.latitude,
      }),
    );
  }
}
