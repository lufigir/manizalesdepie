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
 */

export const WORK_ORDER_CATEGORIES = [
  "debris_removal",
  "animal_rescue",
  "structural_risk",
  "supplies",
  "water",
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
  /** Whose claim this is. Never a name — only enough to know whether the
   *  reader is the one holding it. The exact address lives in
   *  `work_order_contact`, read through `WorkOrderDAL.getContact`, never
   *  here. */
  claimedByMe: z.boolean(),
  /** When an unattended claim frees itself back up — see `CLAIM_DAYS`. Null
   *  once the row is closed. */
  releasesAt: z.iso.datetime({ offset: true }).nullable(),
  verified: z.boolean(),
  confirmedCount: z.number().int().min(0),
  confirmedAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
});

export type WorkOrderDTO = z.infer<typeof workOrderSchema>;

const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

/**
 * What the public form may submit. Anonymous, like a site report — the
 * account is asked for at CLAIM time, not report time, because reporting
 * damage carries none of the reason a claim does (see
 * `canClaimWorkOrder`).
 *
 * The contact fields are the one place this form touches a third party's
 * exact address and phone without their own consent — see the guardrail in
 * AGENTS.md. All optional: a curator can still follow up on a bare pin, and
 * asking for less is always safe to add back later.
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

/** The sensitive half: `work_order_contact`, read only by the claimant and
 *  curators. Every read is logged — see `WorkOrderDAL.getContact`. */
export const workOrderContactSchema = z.object({
  exactAddress: z.string(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
});

export type WorkOrderContactDTO = z.infer<typeof workOrderContactSchema>;
