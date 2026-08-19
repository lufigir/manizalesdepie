import { z } from "zod";

/**
 * The contract for a need — debris, a structural risk, a rescue — in
 * both directions.
 *
 * Scope settled the 14th of August, deliberately smaller than Crisis
 * Cleanup's own model: no `open_assigned`/`open_needs_followup`, no debris-
 * removed flag, no enum of blocking reasons. People are not going to keep a
 * fine-grained status current on something they are not staring at all day,
 * so the detail stays at the two levels that can actually be kept honest —
 * pending / on_the_way / closed, and free text for anything more specific a
 * claimant wants to say. See docs/PLAN.md §3.1.
 *
 * "On the way" changed meaning the 15th, when the single Google-gated
 * claimant became several anonymous attendees: it now means "at least one
 * person said yo puedo atender", not "exactly one person has custody of
 * this".
 *
 * Later the same day, status stopped being something anyone writes at all.
 * It is derived in the database from `need_updates` — see
 * `sync_need_state` — because closing used to be one anonymous tap and
 * a single bad actor could take any case off the map. Nothing in this module
 * sends a status; it only ever reads one back.
 */

// "water" existed briefly and is gone: every real case tagged with it read
// as food, drinking water and shelter together — which is just "supplies"
// with extra steps, not a category of its own. The Postgres enum still
// carries the value (dropping it needs recreating the type) but nothing
// here offers or accepts it any more; the one row that had it was migrated
// to `supplies`.
export const NEED_CATEGORIES = [
  "debris_removal",
  "animal_rescue",
  "structural_risk",
  "supplies",
  "other",
] as const;

export const needCategorySchema = z.enum(NEED_CATEGORIES);

export type NeedCategory = z.infer<typeof needCategorySchema>;

export const NEED_STATUSES = [
  "pending",
  "on_the_way",
  /** Somebody helped and the case is STILL OPEN. The state the old model
   *  could not express: it jumped from "on_the_way" to closed, so the only
   *  way to record having helped was to declare the case over for
   *  everyone. */
  "attended",
  "closed_completed",
  "closed_rejected",
] as const;

export const needStatusSchema = z.enum(NEED_STATUSES);

export type NeedStatus = z.infer<typeof needStatusSchema>;

export const needSchema = z.object({
  id: z.uuid(),
  category: needCategorySchema,
  description: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  neighborhood: z.string().nullable(),
  status: needStatusSchema,
  /** Distinct people who said "yo puedo atender". Several can attend the
   *  same case at once, so there is no single "was it me" flag to give
   *  back the way a lone claimant used to have. */
  onTheWayCount: z.number().int().min(0),
  /** Distinct people who said "ya ayudé". Two of them, from two different
   *  numbers, is what closes a case — see `sync_need_state`. Shown
   *  beside the count above because "cuántos van" and "cuántos ya fueron"
   *  are different questions and a reader deciding whether to go needs
   *  both. */
  helpedCount: z.number().int().min(0),
  /**
   * Somebody said "sigue haciendo falta" AFTER the last "ya ayudé".
   *
   * Derived in the database alongside `status` and never written by this
   * application — see `sync_need_state`. It exists because the status of a
   * contested case is still `attended` (people did turn up, and the thread
   * should keep saying so), which on its own would paint the pin green.
   * Read it with `needRollup`, which is where the two are combined into the
   * one thing a marker can show.
   */
  reopened: z.boolean(),
  /**
   * How to reach whoever this case is about — public since the 15th of
   * August, when the reveal-on-attend gate was removed (see AGENTS.md).
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
  confirmedAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
  /** Read by `AdminActions` to show "Ocultar" vs "Publicar" — a curator-only
   *  toggle, not otherwise shown; `listPublished` already only returns true
   *  rows, so an admin fetch that includes a hidden one is what makes this
   *  matter. */
  published: z.boolean(),
});

export type NeedDTO = z.infer<typeof needSchema>;

const OUT_OF_AREA = "Este mapa solo cubre Manizales y Villamaría.";

/**
 * What the public form may submit. Anonymous, like a site report and like
 * posting an update to one (see `postNeedUpdateSchema`) — nothing about
 * this app's need flow asks for an account any more.
 *
 * The contact fields are published on the card, so the form has to say so
 * where they are typed — this schema cannot enforce consent, only the copy
 * can. They stay optional for exactly that reason: a neighbour reporting
 * somebody else's house should be able to leave every one of them blank and
 * still get the pin onto the map.
 */
export const createNeedSchema = z.object({
  category: needCategorySchema,
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

export type CreateNeedInput = z.infer<typeof createNeedSchema>;

/**
 * What somebody can say about a case. Four verbs, and none of them is a
 * status: a person reports what they did or saw, and the case's state is
 * read out of the pile of those reports.
 */
export const NEED_UPDATE_KINDS = [
  "on_the_way",
  "helped",
  "still_needed",
  "not_real",
] as const;

export const needUpdateKindSchema = z.enum(NEED_UPDATE_KINDS);

export type NeedUpdateKind = z.infer<typeof needUpdateKindSchema>;

/**
 * One entry in a case's book — anonymous, no account.
 *
 * The note is the one thing every entry must carry: it is what makes
 * several entries add up to something instead of three people arriving with
 * the same volqueta on the same morning, and it is addressed to the others
 * on the case, not to us. Name and phone are both optional — leaving them
 * blank publishes the entry as "Anónimo", the same way a site report already
 * can.
 *
 * That trade has one real consequence, documented where it is enforced: a
 * `helped` entry with no phone still shows in the thread and still counts
 * toward "attended", but it can never be one of the two DISTINCT phone
 * numbers `sync_need_state` needs to close a case. Anonymity is free
 * everywhere except the one action that takes a case off the map.
 *
 * Phone, when given, is a bare Colombian mobile number — ten digits, no
 * indicativo. This app covers Manizales and Villamaría only.
 */
export const postNeedUpdateSchema = z.object({
  needId: z.uuid(),
  kind: needUpdateKindSchema,
  name: z.string().trim().min(2, "Escribe tu nombre").max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Solo dígitos, sin indicativo (10 dígitos)")
    .optional(),
  note: z.string().trim().min(3, "Cuenta qué pasó, en pocas palabras").max(500),
});

export type PostNeedUpdateInput = z.infer<typeof postNeedUpdateSchema>;

/** The book, shown on the card as a thread. Public, like the case's own
 *  contact details: coordinating is the point, and a name with no way to
 *  reach it coordinates nothing — but an anonymous entry still says what
 *  happened, which is worth more than not saying it. */
export const needUpdateSchema = z.object({
  id: z.uuid(),
  kind: needUpdateKindSchema,
  name: z.string().nullable(),
  phone: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type NeedUpdateDTO = z.infer<typeof needUpdateSchema>;

/**
 * Correcting a case's own details — category or description — after the
 * fact. Anonymous, like reporting one: this is the same kind of "the sign
 * was wrong" fix a site's status confirmation already is, not a claim on
 * anything sensitive (the contact fields are not editable here).
 */
export const updateNeedSchema = z.object({
  id: z.uuid(),
  category: needCategorySchema.optional(),
  description: z.string().trim().min(5).max(500).optional(),
});

export type UpdateNeedInput = z.infer<typeof updateNeedSchema>;

/**
 * Moving a case's pin. Separate from `updateNeedSchema` because the
 * coordinate authorizes differently from the text: who may move it and how
 * far depends on where it lands, not on a role — see `canRelocate`.
 *
 * The bounds are the same as reporting one. They are the product's scope, and
 * a correction that leaves the scope is not a correction.
 */
export const relocateNeedSchema = z.object({
  id: z.uuid(),
  longitude: z.number().min(-76.2, OUT_OF_AREA).max(-74.8, OUT_OF_AREA),
  latitude: z.number().min(4.6, OUT_OF_AREA).max(5.6, OUT_OF_AREA),
});
