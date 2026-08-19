import { z } from "zod";

/**
 * A barrio, as the report forms need it: a name to pick and a coordinate to
 * fly the map to.
 *
 * Reference data, so this module has no policy and no actions — there is
 * nothing to authorize and nothing to write. The barrios come from the
 * Alcaldía's official layer and the app only ever reads them; inventing the
 * other two files of the usual four would be inventing decisions that do not
 * exist.
 */

export const MUNICIPALITIES = ["manizales", "villamaria"] as const;

export const municipalitySchema = z.enum(MUNICIPALITIES);

export type Municipality = z.infer<typeof municipalitySchema>;

export const neighborhoodSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  municipality: municipalitySchema,
  /** Centre of the barrio. Not where anything IS — it is where the map opens
   *  so that the reporter adjusts metres instead of crossing the city. A
   *  sector row (see `parentName` below) carries this same field, but the
   *  coordinate is its parent's: the official source publishes no geometry
   *  for a sector, so there is nothing of its own to centre on, and this is
   *  the closest honest guess. */
  longitude: z.number(),
  latitude: z.number(),
  /**
   * The barrio with an official polygon that this row falls inside, or null
   * when this row IS that barrio.
   *
   * Most of this table is barrios with real geometry. The rest are sectores
   * — "Topacio", "Venecia", "Aquilino Villegas" — the names people in
   * Manizales actually use, which the Alcaldía's nomenclature lists but does
   * not publish a boundary for. A sector borrows its parent's centroid
   * because there is no coordinate of its own to give it, which means two
   * rows — the sector and its parent — can point the camera at the exact
   * same spot. Without this field the picker would show two entries that
   * look identical and fly to the same place; with it, the interface can say
   * "dentro de Morrogacho" and the person picking Topacio knows why the map
   * opened where it did.
   */
  parentName: z.string().nullable(),
});

export type NeighborhoodDTO = z.infer<typeof neighborhoodSchema>;
