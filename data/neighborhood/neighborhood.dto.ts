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

/**
 * A barrio's current state: evacuation and utilities.
 *
 * Not derived from anything the app writes — these rows come from utility and
 * Alcaldía announcements, loaded by hand the same way `closed_road` was.
 * `unknown` is the honest default: silence from Efigas about a barrio is not
 * evidence the gas is on.
 */
export const UTILITY_STATUSES = ["normal", "suspended", "unknown"] as const;

export const utilityStatusSchema = z.enum(UTILITY_STATUSES);

export type UtilityStatus = z.infer<typeof utilityStatusSchema>;

export const neighborhoodStatusSchema = z.object({
  neighborhoodId: z.uuid(),
  /** Matches `NeighborhoodDTO.name` and `barrios.geojson`'s `name` property —
   *  the key the rest of the app already filters and colours by. */
  name: z.string(),
  municipality: municipalitySchema,
  evacuated: z.boolean(),
  gasStatus: utilityStatusSchema,
  powerStatus: utilityStatusSchema,
  waterStatus: utilityStatusSchema,
  notes: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.url().nullable(),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export type NeighborhoodStatusDTO = z.infer<typeof neighborhoodStatusSchema>;
