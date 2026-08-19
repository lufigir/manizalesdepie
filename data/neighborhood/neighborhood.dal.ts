import "server-only";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  neighborhoodNeedSchema,
  neighborhoodSchema,
  neighborhoodStatusSchema,
  type NeighborhoodDTO,
  type NeighborhoodNeedDTO,
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
   * ~294 rows of six short fields — on the order of ten kilobytes on the
   * wire. That is still well under the 149 KB of `public/barrios.geojson`'s
   * 114 polygons, and the comparison is more one-sided than it looks: the
   * geojson carries polygons for the barrios only and has no sector rows in
   * it at all, so it could not serve this picker even at its own size.
   */
  async list(): Promise<NeighborhoodDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("neighborhood_public")
      .select("id, name, municipality, longitude, latitude, parent")
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
        parentName: row.parent,
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
        "neighborhood_id, neighborhood, municipality, evacuated, gas_status, power_status, water_status, notes, confirmed_at, expires_at",
      )
      .gt("expires_at", new Date().toISOString());

    if (error) {
      // The view was added after the first deploy. Until that migration reaches
      // a local or remote project, the absence of status data is a valid empty
      // state and should not make the map look broken in the console.
      if (error.code !== "PGRST205") {
        log.error("neighborhood.statuses failed", { code: error.code });
      }
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
        confirmedAt: row.confirmed_at,
        expiresAt: row.expires_at,
      }),
    );
  }

  /**
   * Every frente still on record — "este barrio necesita X" — soonest
   * expiring first within the same priority, so a critical declaration about
   * to lapse surfaces before a normal one that just renewed.
   *
   * Curated by hand, like `statuses()` above: no policy, no actions, this is
   * our own prioritisation rather than a claim the app writes.
   */
  async needs(): Promise<NeighborhoodNeedDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("neighborhood_need_public")
      .select(
        "id, neighborhood_id, neighborhood, municipality, longitude, latitude, category, priority, note, confirmed_at, expires_at",
      )
      .gt("expires_at", new Date().toISOString());

    if (error) {
      // Same tolerance as statuses(): the view can lag a migration reaching a
      // given environment, and a missing table of frentes is a valid empty
      // state, not a reason to take the map down.
      if (error.code !== "PGRST205") {
        log.error("neighborhood.needs failed", { code: error.code });
      }
      return [];
    }

    return (data ?? []).map((row) =>
      neighborhoodNeedSchema.parse({
        id: row.id,
        neighborhoodId: row.neighborhood_id,
        name: row.neighborhood,
        municipality: row.municipality,
        longitude: row.longitude,
        latitude: row.latitude,
        category: row.category,
        priority: row.priority,
        note: row.note,
        confirmedAt: row.confirmed_at,
        expiresAt: row.expires_at,
      }),
    );
  }
}
