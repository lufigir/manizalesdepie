import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

/**
 * Which barrio a coordinate falls in, as `neighborhood.id`, or null outside
 * every polygon we hold — the whole of Villamaría, among other places.
 *
 * A plain function rather than the class-with-private-constructor shape every
 * other DAL here takes, and the reason is the shape's own reason: the private
 * constructor exists so an instance cannot exist without a resolved
 * authorization context. There is nothing to authorize here. The barrio
 * polygons are public reference data — the same shapes the browser already
 * downloads as `public/barrios.geojson` to draw the outlines — and this
 * returns one uuid about a point the caller already has. A factory taking a
 * session it would then ignore would be ceremony that teaches the wrong thing.
 *
 * It lives in a `.dal.ts` file because it reaches the database, and that is
 * the boundary `eslint.config.mjs` enforces: the admin client is importable
 * from here and from nowhere else in `data/`.
 *
 * `neighborhood_at` is the same function the insert triggers call to stamp
 * `neighborhood_id`, deliberately: relocation has to authorize against the
 * answer the database is about to write, not a second opinion computed
 * alongside it.
 */
export async function resolveNeighborhoodId(
  longitude: number,
  latitude: number,
): Promise<string | null> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc("neighborhood_at", {
    lng: longitude,
    lat: latitude,
  });

  if (error) {
    log.error("geo.resolveNeighborhoodId failed", { code: error.code });
    throw new Error("No se pudo ubicar el barrio de ese punto");
  }

  return (data as string | null) ?? null;
}
