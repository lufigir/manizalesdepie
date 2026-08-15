import { z } from "zod";

/**
 * The contract for a work order — debris, a structural risk, a rescue — in
 * both directions.
 *
 * Scope settled the 14th of August, deliberately smaller than Crisis
 * Cleanup's own model: no `open_assigned`/`open_needs_followup`, no debris-
 * removed flag, no enum of blocking reasons. People are not going to keep a
 * fine-grained status current on something they are not staring at all day,
 * so the detail stays at the two levels that can actually be kept honest —
 * unclaimed / claimed / closed, and free text for anything more specific a
 * claimant wants to say. See docs/PLAN.md §3.1.
 *
 * "Claimed" changed meaning the 15th, when the single Google-gated claimant
 * became several anonymous attendees (see `work_order_attendance`): it now
 * means "at least one person said yo puedo atender", not "exactly one
 * person has custody of this".
 */

// "water" existed briefly and is gone: every real case tagged with it read
// as food, drinking water and shelter together — which is just "supplies"
// with extra steps, not a category of its own. The Postgres enum still
// carries the value (dropping it needs recreating the type, the same reason
// `site_type` keeps `water_point`/`vet_clinic` after the map stopped
// drawing them) but nothing here offers or accepts it any more; the one row
// that had it was migrated to `supplies`.
export const WORK_ORDER_CATEGORIES = [
  "debris_removal",
  "animal_rescue",
  "structural_risk",
  "supplies",
  "other",
] as const;

export const workOrderCategorySchema = z.enum(WORK_ORDER_CATEGORIES);

export type WorkOrderCategory = z.infer<typeof workOrderCategorySchema>;

export const WORK_ORDER_STATUSES = [
  "unclaimed",
  "claimed",
  "closed_completed",
  "closed_by_others",
  "closed_rejected",
] as const;

export const workOrderStatusSchema = z.enum(WORK_ORDER_STATUSES);

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const workOrderSchema = z.object({
  id: z.uuid(),
  category: workOrderCategorySchema,
  description: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  neighborhood: z.string().nullable(),
  status: workOrderStatusSchema,
  /** How many people have said "yo puedo atender". Several can attend the
   *  same case at once, so there is no single "was it me" flag to give
   *  back the way a lone claimant used to have. */
  attendeeCount: z.number().int().min(0),
  /**
   * How to reach whoever this case is about — public since the 15th of
   * August, when the reveal-on-attend gate was removed (see the migration
   * `20260815000000_public_work_order_contact`).
   *
   * Every one of them is nullable and usually will be: the person filling
   * the form is often a neighbour reporting somebody else's house, and the
   * form says out loud that these fields are visible to anyone. A case with
   * nothing here is still a case — the pin and the barrio are what make it
   * findable.
   */
  exactAddress: z.string().nullable(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  verified: z.boolean(),
  confirmedCount: z.number().int().min(0),
  confirmedAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
  /** Read by `AdminActions` to show "Ocultar" vs "Publicar" — a curator-only
   *  toggle, not otherwise shown; `listPublished` already only returns true
   *  rows, so an admin fetch that includes a hidden one is what makes this
   *  matter. */
  published: z.boolean(),
});

export type WorkOrderDTO = z.infer<typeof workOrderSchema>;

const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

/**
 * What the public form may submit. Anonymous, like a site report and like
 * attending one (see `attendWorkOrderSchema`) — nothing about this app's
 * work-order flow asks for an account any more.
 *
 * The contact fields are published on the card, so the form has to say so
 * where they are typed — this schema cannot enforce consent, only the copy
 * can. They stay optional for exactly that reason: a neighbour reporting
 * somebody else's house should be able to leave every one of them blank and
 * still get the pin onto the map.
 */
export const createWorkOrderSchema = z.object({
  category: workOrderCategorySchema,
  description: z.string().trim().min(5).max(500),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
  exactAddress: z.string().trim().max(200).optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, "Debe ser solo dígitos")
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

/**
 * "Yo puedo atender" — anonymous, no account. Name and phone are both
 * required, unlike a grupo's optional whatsapp: a headcount is still useful
 * for a shift, but showing up at someone's damaged house needs to know who
 * is actually coming.
 *
 * The note is what makes several attendees add up to something instead of
 * three people arriving with the same volqueta on the same morning. It is
 * addressed to the other attendees, not to us.
 */
export const attendWorkOrderSchema = z.object({
  workOrderId: z.uuid(),
  name: z.string().trim().min(2, "Escribe tu nombre").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, "Solo dígitos, con indicativo del país"),
  note: z.string().trim().max(500).optional(),
});

export type AttendWorkOrderInput = z.infer<typeof attendWorkOrderSchema>;

/** Who is on a case, shown on the card. Public, like the case's own contact
 *  details: coordinating is the point, and a name with no way to reach it
 *  coordinates nothing. */
export const workOrderAttendeeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type WorkOrderAttendeeDTO = z.infer<typeof workOrderAttendeeSchema>;

/**
 * Correcting a case's own details — category or description — after the
 * fact. Anonymous, like reporting one: this is the same kind of "the sign
 * was wrong" fix a site's status confirmation already is, not a claim on
 * anything sensitive (`work_order_contact` is not editable here).
 */
export const updateWorkOrderSchema = z.object({
  id: z.uuid(),
  category: workOrderCategorySchema.optional(),
  description: z.string().trim().min(5).max(500).optional(),
});

export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
