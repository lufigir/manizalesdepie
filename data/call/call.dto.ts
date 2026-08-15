import { z } from "zod";

/**
 * The contract for a grupo — a shift, a brigade, a cuadrilla — in both
 * directions.
 *
 * A call differs from a site in the one way that shapes everything downstream:
 * it has an hour. A site is somewhere you can go; a call is somewhere you have
 * to be at a time, and it stops existing when it ends. That is why the schema
 * carries `startsAt` as required and why `expiresAt` is derived from the end of
 * the shift rather than from a freshness window.
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
  title: z.string(),
  /** True when this came from `CallDAL.gather` — no title was given, so one
   *  was synthesised (see `title` above). Readers use this to know that
   *  `startsAt` is the moment someone reported it, not a scheduled hour, and
   *  say so instead of printing a clock time nobody chose. */
  informal: z.boolean(),
  category: callCategorySchema,
  description: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  meetingAddress: z.string().nullable(),
  neighborhood: z.string().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).nullable(),
  /** Null means "as many as show up". A number is a promise the organiser made
   *  and the reason the counter below is worth showing. */
  slotsTotal: z.number().int().nullable(),
  slotsTaken: z.number().int().min(0),
  /** What to bring. Gloves and a shovel are the difference between helping and
   *  standing around, and nobody thinks of it on the way out the door. */
  bring: z.string().nullable(),
  /** The ORGANISER's number, published on purpose so someone can ask whether
   *  the shift is still on. A volunteer's number never leaves call_attendance. */
  whatsapp: z.string().nullable(),
  verified: z.boolean(),
  confirmedCount: z.number().int().min(0),
  confirmedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  /** Who convened it. Not a name — only the id, and only so the page can show
   *  the attendee list to that one person. */
  createdById: z.uuid().nullable(),
  /** Read by `AdminActions` for the "Ocultar"/"Publicar" toggle — a
   *  curator-only fact; `listPublished` only returns a hidden row at all
   *  when the caller is a curator. */
  published: z.boolean(),
});

export type CallDTO = z.infer<typeof callSchema>;

const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

/**
 * What the create form may submit.
 *
 * Unlike every other form in this app, this one requires an account — see
 * `canCreateCall`. The gate is in the policy and enforced in the DAL; the
 * schema only describes the shape.
 */
export const createCallSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(6, "Escribe qué se va a hacer, en pocas palabras")
      .max(120),
    category: callCategorySchema,
    description: z.string().trim().max(1000).optional(),
    longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
    latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
    // Required, unlike the column. See the note on `address` in site.dto.ts —
    // and here it matters more: ten people have to reach the same corner at the
    // same hour, and "en Chipre" is not a place to stand.
    meetingAddress: z
      .string()
      .trim()
      .min(5, "Escribe la esquina o el punto exacto donde se van a ver")
      .max(200),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }).optional(),
    // Capped low on purpose. This is ten neighbours with shovels, not a stadium
    // event, and a number in the thousands is a typo or a fantasy.
    slotsTotal: z.number().int().min(1).max(500).optional(),
    bring: z.string().trim().max(300).optional(),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
      .optional(),
  })
  .refine(
    (call) => !call.endsAt || new Date(call.endsAt) > new Date(call.startsAt),
    { message: "La hora de fin va después de la de inicio", path: ["endsAt"] },
  );

export type CreateCallInput = z.infer<typeof createCallSchema>;

/**
 * "Alguien ya se está juntando aquí" — the informal version.
 *
 * Not a shorter form of `createCallSchema`, a different promise. A formal
 * grupo is a commitment someone made and other people are trusting; this is
 * a sighting. No title (there is often no name for it yet), no hour (see
 * `CallDAL.gather` — it is stamped "starting now" and left to expire at the
 * end of the day on its own), no slots, no organiser's WhatsApp — there is no
 * organiser. `canCreateInformalCall` in call.policy.ts is the reason: this
 * path never asks for an account, so it can never collect a phone number
 * beyond what an anonymous reporter chooses to type into `description`.
 */
export const createInformalCallSchema = z.object({
  category: callCategorySchema,
  description: z.string().trim().max(500).optional(),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
  meetingAddress: z.string().trim().max(200).optional(),
});

export type CreateInformalCallInput = z.infer<
  typeof createInformalCallSchema
>;

/**
 * "Sigue por aquí, no allá" — moving an informal pin after the fact.
 *
 * No account either, same reasoning as `createInformalCallSchema`: nobody is
 * trusting a named organiser, so there is no one whose permission this needs
 * beyond "is this actually the informal kind" — checked in the DAL, not
 * here, because it requires a row to check against.
 */
export const relocateInformalCallSchema = z.object({
  callId: z.uuid(),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
});

export type RelocateInformalCallInput = z.infer<
  typeof relocateInformalCallSchema
>;

/**
 * "Quiero participar", in full.
 *
 * One optional field, and that is the whole design. The documented pattern from
 * disaster platforms is that a signup taking longer than a minute loses the
 * spontaneous volunteer, who is most of the people who show up. Leaving the
 * number blank is allowed: that person is a headcount rather than a contact,
 * and the organiser cannot warn them if the shift is called off.
 */
export const joinCallSchema = z.object({
  callId: z.uuid(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Solo dígitos, con indicativo del país")
    .optional(),
  /** Tapped during curfew, when "voy ahora" is not something anyone may act on.
   *  The organiser needs to see who meant tomorrow. */
  forTomorrow: z.boolean().default(false),
});

export type JoinCallInput = z.infer<typeof joinCallSchema>;

/** One person who said they would come. Only the organiser and curators ever
 *  see this shape; it is the reason creating a call requires an account. */
export const attendeeSchema = z.object({
  id: z.uuid(),
  whatsapp: z.string().nullable(),
  forTomorrow: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type AttendeeDTO = z.infer<typeof attendeeSchema>;

/** A curator correcting any of a grupo's own fields — the meeting point is
 *  not here, same reasoning as `adminUpdateSiteSchema`. */
export const adminUpdateCallSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(6).max(120).optional(),
    category: callCategorySchema.optional(),
    description: z.string().trim().max(1000).optional(),
    meetingAddress: z.string().trim().min(5).max(200).optional(),
    startsAt: z.iso.datetime({ offset: true }).optional(),
    endsAt: z.iso.datetime({ offset: true }).optional(),
    slotsTotal: z.number().int().min(1).max(500).optional(),
    bring: z.string().trim().max(300).optional(),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\d{10,15}$/, "Debe ser solo dígitos, con indicativo del país")
      .optional(),
  })
  .refine(
    (call) =>
      !call.startsAt || !call.endsAt || new Date(call.endsAt) > new Date(call.startsAt),
    { message: "La hora de fin va después de la de inicio", path: ["endsAt"] },
  );

export type AdminUpdateCallInput = z.infer<typeof adminUpdateCallSchema>;
