import { z } from "zod";

/**
 * The contract for a resource offer — a truck, a pair of hands, a spare room —
 * in both directions.
 *
 * Unlike a site, an offer is not anchored to one exact spot. "Tengo una
 * volqueta disponible" is a barrio-level fact, not a corner — `longitude`
 * and `latitude` are nullable here for that reason, and `area` carries the
 * free-text version of the same idea when there is no point at all.
 */

export const RESOURCE_TYPES = [
  "dump_truck",
  "pickup",
  "tools",
  "warehouse",
  "free_transport",
  "machinery",
  "home_stay",
  "other",
] as const;

export const resourceTypeSchema = z.enum(RESOURCE_TYPES);

export type ResourceType = z.infer<typeof resourceTypeSchema>;

export const resourceOfferSchema = z.object({
  id: z.uuid(),
  type: resourceTypeSchema,
  description: z.string(),
  quantity: z.number().int().nullable(),
  area: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  neighborhood: z.string().nullable(),
  whatsapp: z.string(),
  availableFrom: z.iso.datetime({ offset: true }).nullable(),
  availableUntil: z.iso.datetime({ offset: true }).nullable(),
  verified: z.boolean(),
  confirmedCount: z.number().int().min(0),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  createdById: z.uuid().nullable(),
});

export type ResourceOfferDTO = z.infer<typeof resourceOfferSchema>;

/**
 * What the public form may submit. Anonymous, like a site report — see
 * `canProposeResourceOffer` — but `whatsapp` is required regardless, because
 * without it an offer is unusable: nobody can take you up on it.
 *
 * No exact pin: the barrio alone sets `area` and, through it, the
 * neighborhood a reader filters by. A precise point does not mean anything
 * for "tengo una volqueta" the way it does for a fixed collection point.
 */
export const createResourceOfferSchema = z.object({
  type: resourceTypeSchema,
  description: z.string().trim().min(5).max(500),
  quantity: z.number().int().min(1).max(9999).optional(),
  area: z.string().trim().max(120),
  longitude: z.number().min(-76.2).max(-74.8).optional(),
  latitude: z.number().min(4.6).max(5.6).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país"),
  availableFrom: z.iso.datetime({ offset: true }).optional(),
  availableUntil: z.iso.datetime({ offset: true }).optional(),
});

export type CreateResourceOfferInput = z.infer<
  typeof createResourceOfferSchema
>;
