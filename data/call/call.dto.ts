import { z } from "zod";

/**
 * The contract for a grupo — gente que se está juntando a hacer algo — in both
 * directions.
 *
 * There used to be two kinds: a shift somebody convened, with an hour, a
 * roster and a cap, and a sighting somebody reported. Thirteen grupos in,
 * ten had no title, one had an end hour, one had a cap, and one person in
 * total ever signed up. The scheduled kind described something that was not
 * happening, so it is gone and this is the only kind left.
 *
 * What survives from it: a grupo still has a moment (`startsAt`, stamped when
 * it was reported) and still stops existing, at the end of the day in Bogotá.
 * That is different from a site going stale, and it is why `expiresAt` is
 * derived rather than asked for.
 */

export const CALL_CATEGORIES = [
  "debris_removal",
  "logistics",
  "census",
  "animals",
  "health",
  "structural_survey",
  "other",
] as const;

export const callCategorySchema = z.enum(CALL_CATEGORIES);

export type CallCategory = z.infer<typeof callCategorySchema>;

export const callSchema = z.object({
  id: z.uuid(),
  /** Never stored. `CallDAL.toDTO` builds "Escombros en Chipre" from the
   *  category and the barrio, because every reader — the popup, the list, the
   *  share text, the OG card — needs something to call this, and nobody
   *  reporting a gathering has a name for it yet. */
  title: z.string(),
  category: callCategorySchema,
  description: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  meetingAddress: z.string().nullable(),
  neighborhood: z.string().nullable(),
  /** When it was reported, not an hour anybody chose. Readers say "desde"
   *  rather than printing a start time. */
  startsAt: z.iso.datetime({ offset: true }),
  /** Whoever reported it, if they left a number. Optional, and the only
   *  contact this table has ever carried. */
  whatsapp: z.string().nullable(),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  /** Only so the page can tell the reporter apart from everyone else. */
  createdById: z.uuid().nullable(),
  /** Read by `AdminActions` for the "Ocultar"/"Publicar" toggle — a
   *  curator-only fact; `listPublished` only returns a hidden row at all
   *  when the caller is a curator. */
  published: z.boolean(),
});

export type CallDTO = z.infer<typeof callSchema>;

const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

/**
 * What the create form may submit. Five fields, one screen, no account.
 *
 * The account requirement went with the roster: it existed to protect the
 * phone numbers of people who signed up, and nobody signs up any more. The
 * only number here belongs to whoever chose to type it.
 *
 * `meetingAddress` is optional, unlike the old scheduled form where it was
 * required. There is no hour to be punctual for, the pin already says where,
 * and a passer-by reporting a cuadrilla frequently does not know the address.
 */
export const createCallSchema = z.object({
  category: callCategorySchema,
  description: z.string().trim().max(1000).optional(),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
  meetingAddress: z.string().trim().max(200).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;

/**
 * "Sigue por aquí, no allá" — moving a pin after the fact.
 *
 * No account. Nobody is trusting a named organiser, so there is no one whose
 * permission this needs beyond staying inside the same barrio, which the DAL
 * checks because it requires a row to check against.
 */
export const relocateCallSchema = z.object({
  callId: z.uuid(),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
});

export type RelocateCallInput = z.infer<typeof relocateCallSchema>;

/** A curator correcting any of a grupo's own fields — the meeting point is
 *  not here, same reasoning as `adminUpdateSiteSchema`. */
export const adminUpdateCallSchema = z.object({
  id: z.uuid(),
  category: callCategorySchema.optional(),
  description: z.string().trim().max(1000).optional(),
  meetingAddress: z.string().trim().max(200).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
    .optional(),
});

export type AdminUpdateCallInput = z.infer<typeof adminUpdateCallSchema>;
