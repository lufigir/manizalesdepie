import { z } from "zod";

/**
 * The contract for a service — a truck, a pair of hands, a spare room —
 * in both directions.
 *
 * Unlike a site, a service is not anchored to one exact spot. "Tengo una
 * volqueta disponible" is a barrio-level fact, not a corner — `longitude`
 * and `latitude` are nullable here for that reason, and `area` carries the
 * free-text version of the same idea when there is no point at all.
 */

export const SERVICE_TYPES = [
  "dump_truck",
  "pickup",
  "tools",
  "warehouse",
  "free_transport",
  "machinery",
  "home_stay",
  "other",
] as const;

export const serviceTypeSchema = z.enum(SERVICE_TYPES);

export type ServiceType = z.infer<typeof serviceTypeSchema>;

export const serviceSchema = z.object({
  id: z.uuid(),
  type: serviceTypeSchema,
  description: z.string(),
  area: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  neighborhood: z.string().nullable(),
  whatsapp: z.string(),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  createdById: z.uuid().nullable(),
  /** Read by `AdminActions` for the "Ocultar"/"Publicar" toggle — a
   *  curator-only fact; `listPublished` only returns a hidden row at all
   *  when the caller is a curator. */
  published: z.boolean(),
});

export type ServiceDTO = z.infer<typeof serviceSchema>;

/**
 * What the public form may submit. Anonymous, like a site report — see
 * `canProposeService` — but `whatsapp` is required regardless, because
 * without it a service is unusable: nobody can take you up on it.
 *
 * No exact pin: the barrio alone sets `area` and, through it, the
 * neighborhood a reader filters by. A precise point does not mean anything
 * for "tengo una volqueta" the way it does for a fixed collection point.
 */
export const createServiceSchema = z.object({
  type: serviceTypeSchema,
  description: z.string().trim().min(5).max(500),
  area: z.string().trim().max(120),
  longitude: z.number().min(-76.2).max(-74.8).optional(),
  latitude: z.number().min(4.6).max(5.6).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país"),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

/** Correcting a service's own fields — anyone, see `canEditService`.
 *  Not the point: a service is pinned at its barrio's centroid by design. */
export const updateServiceSchema = z.object({
  id: z.uuid(),
  type: serviceTypeSchema.optional(),
  description: z.string().trim().min(5).max(500).optional(),
  area: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
