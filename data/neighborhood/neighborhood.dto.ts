import { z } from "zod";

import { callCategorySchema } from "@/data/call/call.dto";

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
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export type NeighborhoodStatusDTO = z.infer<typeof neighborhoodStatusSchema>;

/**
 * A frente: "este barrio necesita X", declared by the curator team so that
 * armar un grupo starts from a problem already on record instead of someone
 * inventing the category, the priority and the barrio from nothing.
 *
 * `category` is `CallCategory`, not a category of its own — a frente's
 * category IS the kind of work a grupo there does, and reusing the type is
 * what lets "Armar un grupo aquí" prefill the form without translating
 * between two vocabularies for the same idea.
 */
export const NEED_PRIORITIES = ["critical", "high", "normal"] as const;

export const needPrioritySchema = z.enum(NEED_PRIORITIES);

export type NeedPriority = z.infer<typeof needPrioritySchema>;

export const neighborhoodNeedSchema = z.object({
  id: z.uuid(),
  neighborhoodId: z.uuid(),
  /** Matches `NeighborhoodDTO.name`, same convention as
   *  `NeighborhoodStatusDTO.name`. */
  name: z.string(),
  municipality: municipalitySchema,
  longitude: z.number(),
  latitude: z.number(),
  category: callCategorySchema,
  priority: needPrioritySchema,
  note: z.string().nullable(),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export type NeighborhoodNeedDTO = z.infer<typeof neighborhoodNeedSchema>;
