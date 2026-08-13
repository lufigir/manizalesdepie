import { z } from "zod";

/**
 * The contract for a site, in both directions. Input because users lie; output
 * because Postgres returns more than the browser should see.
 *
 * Nothing here is spread from a database row. Every field is mapped
 * explicitly in the DAL, so a column added to `site` tomorrow cannot leak into
 * the client by accident.
 */

export const SITE_TYPES = [
  "collection_point",
  "shelter",
  "blood_donation",
  "vet_clinic",
  "water_point",
  "medical_post",
] as const;

export const SITE_STATUSES = ["open", "full", "closed", "unknown"] as const;

export const ITEM_MODES = ["needed", "not_accepted", "sufficient"] as const;

export const siteTypeSchema = z.enum(SITE_TYPES);
export const siteStatusSchema = z.enum(SITE_STATUSES);
export const itemModeSchema = z.enum(ITEM_MODES);

export type SiteType = z.infer<typeof siteTypeSchema>;
export type SiteStatus = z.infer<typeof siteStatusSchema>;
export type ItemMode = z.infer<typeof itemModeSchema>;

export const siteItemSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  mode: itemModeSchema,
  priority: z.number().int(),
});

export const siteSchema = z.object({
  id: z.uuid(),
  type: siteTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  neighborhood: z.string().nullable(),
  status: siteStatusSchema,
  schedule: z.string().nullable(),
  whatsapp: z.string().nullable(),
  sourceUrl: z.url().nullable(),
  /** A curator checked this against the source. Shown as a badge. */
  verified: z.boolean(),
  /** Last time anyone said "yes, this is still true". Drives the freshness
   *  label; a stale row is demoted on the map, never hidden. */
  confirmedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  items: z.array(siteItemSchema),
});

export type SiteDTO = z.infer<typeof siteSchema>;

/** What the public report form may submit. Coordinates are bounded to the
 *  Manizales–Villamaría area so a mis-dropped pin cannot land in the ocean. */
export const createSiteSchema = z.object({
  type: siteTypeSchema,
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(200).optional(),
  longitude: z.number().min(-76.2).max(-74.8),
  latitude: z.number().min(4.6).max(5.6),
  schedule: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
  sourceUrl: z.url().optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteStatusSchema = z.object({
  id: z.uuid(),
  status: siteStatusSchema,
});
