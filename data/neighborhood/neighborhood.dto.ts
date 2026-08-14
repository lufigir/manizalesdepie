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
   *  so that the reporter adjusts metres instead of crossing the city. */
  longitude: z.number(),
  latitude: z.number(),
});

export type NeighborhoodDTO = z.infer<typeof neighborhoodSchema>;
