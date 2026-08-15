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
  /** Where an affected person registers to reach the census and the rent
   *  subsidy. It serves the affected rather than the helper, which is the one
   *  exception the product makes: without the census there is no subsidy. */
  "census_point",
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
  /** How many people have stood in front of this and said it is still true.
   *  Drives the confidence level the map draws; "no longer valid" reports do
   *  not increment it, because saying a place is gone is not evidence that it
   *  is there. */
  confirmedCount: z.number().int().min(0),
  /**
   * Last time anyone said "yes, this is still true". Drives the freshness
   * label; a stale row is demoted on the map, never hidden.
   *
   * `offset: true` is required, not cosmetic: PostgREST serialises a timestamptz
   * as "2026-08-14T02:12:27.271436+00:00", and Zod's default ISO datetime only
   * accepts a "Z" suffix. Without it every row fails validation the moment real
   * data exists — which is exactly when nobody wants to be debugging a schema.
   */
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  items: z.array(siteItemSchema),
  /** Read by `AdminActions` for the "Ocultar"/"Publicar" toggle — a
   *  curator-only fact, otherwise not shown; `listPublished` only returns a
   *  hidden row at all when the caller is a curator. */
  published: z.boolean(),
});

export type SiteDTO = z.infer<typeof siteSchema>;

/**
 * What the public report form may submit.
 *
 * The bounds are the product's scope made enforceable: this map covers
 * Manizales and Villamaría, and a report from Pereira or Dosquebradas — the
 * relief WhatsApp groups carry plenty — is rejected at the door with a message
 * saying so, rather than accepted into a queue nobody will ever work.
 *
 * The message matters as much as the check. Silently refusing a real report
 * from a real person during an emergency is worse than not offering the form.
 */
const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

export const createSiteSchema = z.object({
  type: siteTypeSchema,
  name: z.string().trim().min(3, "Escribe un nombre reconocible").max(120),
  description: z.string().trim().max(1000).optional(),
  /**
   * Required, unlike the column behind it.
   *
   * The form stopped asking people to find their own street on a map of the
   * whole city, so the written reference is now what carries the precision the
   * dragged pin used to. The column stays nullable on purpose: the rows already
   * published do not all have one, and neither will the spreadsheets loaded
   * over MCP. The demand belongs where the person who can answer it is
   * standing, not on every row that will ever exist.
   */
  address: z
    .string()
    .trim()
    .min(5, "Escribe la cuadra, la esquina o un punto de referencia")
    .max(200),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
  schedule: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteStatusSchema = z.object({
  id: z.uuid(),
  status: siteStatusSchema,
});

/**
 * A curator correcting any of a site's own fields — the coordinate is not
 * here: moving a pin needs a map picker, which the inline card does not
 * have, so relocating a site stays a delete-and-reproposal for now.
 */
export const adminUpdateSiteSchema = z.object({
  id: z.uuid(),
  type: siteTypeSchema.optional(),
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(200).optional(),
  schedule: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
});

export type AdminUpdateSiteInput = z.infer<typeof adminUpdateSiteSchema>;
