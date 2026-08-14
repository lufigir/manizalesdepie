import "server-only";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  neighborhoodSchema,
  neighborhoodStatusSchema,
  type NeighborhoodDTO,
  type NeighborhoodStatusDTO,
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

  /**
   * Every barrio that has a status on record — evacuation, gas, power, water —
   * and has not expired.
   *
   * A handful of rows, not 118: only barrios an announcement actually named get
   * one. The rest stay unlisted rather than defaulting to "normal", because
   * silence is not the same claim as a utility saying so.
   */
  async statuses(): Promise<NeighborhoodStatusDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("neighborhood_status_public")
      .select(
        "neighborhood_id, neighborhood, municipality, evacuated, gas_status, power_status, water_status, notes, source, source_url, confirmed_at, expires_at",
      )
      .gt("expires_at", new Date().toISOString());

    if (error) {
      log.error("neighborhood.statuses failed", { code: error.code });
      // Never blocks the map: a barrio with no status behaves exactly like one
      // nobody has reported on, which is the correct fallback either way.
      return [];
    }

    return (data ?? []).map((row) =>
      neighborhoodStatusSchema.parse({
        neighborhoodId: row.neighborhood_id,
        name: row.neighborhood,
        municipality: row.municipality,
        evacuated: row.evacuated,
        gasStatus: row.gas_status,
        powerStatus: row.power_status,
        waterStatus: row.water_status,
        notes: row.notes,
        source: row.source,
        sourceUrl: row.source_url,
        confirmedAt: row.confirmed_at,
        expiresAt: row.expires_at,
      }),
    );
  }
}
