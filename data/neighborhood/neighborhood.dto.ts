import { z } from "zod";

import { workOrderCategorySchema } from "@/data/work_order/work_order.dto";

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
 * A frente: "este barrio necesita X", declared by hand so that a barrio's
 * standing problem is on record instead of having to be inferred from the
 * individual cases inside it.
 *
 * `category` is `WorkOrderCategory`, not a category of its own. It used to be
 * `CallCategory`, on the reasoning that a frente's category IS the kind of
 * work a grupo does there — with the grupos gone (see the migration
 * `20260815060000_drop_calls`) the only thing a frente can describe is the
 * kind of necesidad a barrio is full of, so it takes the vocabulary the
 * cases themselves use. That also makes the match in `lib/urgency.ts` exact
 * rather than the near-miss it always was: a frente now weights the cases in
 * its own category instead of falling back to the whole barrio.
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
  category: workOrderCategorySchema,
  priority: needPrioritySchema,
  note: z.string().nullable(),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export type NeighborhoodNeedDTO = z.infer<typeof neighborhoodNeedSchema>;
