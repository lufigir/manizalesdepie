import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/current-user";
import { log } from "@/lib/log";
import { needs as needRows, type NeedRow } from "@/lib/demo/dataset";

import { resolveNeighborhood } from "@/data/geo/geo.dal";
import { canRelocate } from "@/data/geo/relocation.policy";

import {
  createNeedSchema,
  postNeedUpdateSchema,
  relocateNeedSchema,
  updateNeedSchema,
  needSchema,
  needUpdateSchema,
  type NeedDTO,
  type NeedUpdateDTO,
} from "./need.dto";
import {
  canCloseNeed,
  canDeleteNeedUpdate,
  canManageNeed,
  canPostNeedUpdate,
  canReportNeed,
  canUpdateNeed,
  deriveNeedState,
} from "./need.policy";

/**
 * The only path from this application to the cases and their threads.
 *
 * A need's contact fields are public, so there is no second visibility rule
 * to keep and no reveal left to audit.
 *
 * Private constructor and static factories, like `SiteDAL` — kept even though
 * most methods here need no identity, because `close` still does, and a class
 * with a public constructor would let that one slip through unauthorized by
 * accident.
 *
 * The status is the thing to read carefully. It is not stored on a case in
 * the fixtures and it is not writable here: `deriveNeedState` computes it
 * from the case's own book, which is what the `sync_need_state` trigger did
 * in Postgres. One person says what they did; no person decides what the case
 * is.
 */
export class NeedDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  static async create(): Promise<NeedDAL> {
    return new NeedDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): NeedDAL {
    return new NeedDAL(null);
  }

  /**
   * Every case, most recently confirmed first.
   *
   * A curator sees hidden cases too, distinguished on the card by
   * `AdminActions`; anyone else only ever sees the published ones. The live
   * version also dropped a closed case six hours after it was closed — this
   * one keeps them, because a demo with no closed case in it never shows what
   * a curator's verdict looks like.
   */
  async listPublished(): Promise<NeedDTO[]> {
    const curator = this.user?.role === "curator";

    return needRows()
      .filter((row) => curator || row.published)
      .map((row) => this.toDTO(row))
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  }

  /**
   * One case, or null. What a shared link resolves to.
   *
   * A link posted in a WhatsApp group outlives the case it points at, so a
   * closed one still resolves: "ya se resolvió" on the card is a better
   * answer than a 404 for someone arriving late.
   */
  async findById(id: string): Promise<NeedDTO | null> {
    const curator = this.user?.role === "curator";
    const row = needRows().find((candidate) => candidate.id === id);

    if (!row || (!row.published && !curator)) return null;

    return this.toDTO(row);
  }

  /**
   * Reports debris, a structural risk, whatever needs a volqueta or a pair
   * of hands. Anonymous, on the map immediately.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async report(input: unknown): Promise<NeedDTO> {
    const data = createNeedSchema.parse(input);

    if (!canReportNeed()) throw new Error("Forbidden");

    const now = new Date().toISOString();

    const need = needSchema.parse({
      id: crypto.randomUUID(),
      category: data.category,
      description: data.description,
      longitude: data.longitude,
      latitude: data.latitude,
      neighborhood:
        resolveNeighborhood(data.longitude, data.latitude)?.name ?? null,
      // Not sent, derived: a case with no entries in its book is `pending`,
      // and that is the only status a new report can possibly have.
      ...deriveNeedState([], null, now),
      exactAddress: data.exactAddress ?? null,
      contactName: data.contactName ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      published: true,
    });

    log.info("need reported", { needId: need.id, byUser: this.user?.id ?? "anon" });
    return need;
  }

  /**
   * Adds one entry to a case's book — anonymous, no account, several people
   * per case, each leaving a note for the others.
   *
   * Note what it does NOT return: a status. The entry goes back on its own
   * and the case's state is recomputed from every entry on it, by the same
   * `deriveNeedState` this DAL reads with. That is the whole point of the
   * design — one person can say what they did, and no person can decide what
   * the case is.
   */
  async postUpdate(input: unknown): Promise<NeedUpdateDTO> {
    const data = postNeedUpdateSchema.parse(input);

    if (!canPostNeedUpdate()) throw new Error("Forbidden");

    const entry = needUpdateSchema.parse({
      id: crypto.randomUUID(),
      kind: data.kind,
      name: data.name ?? null,
      phone: data.phone ?? null,
      note: data.note,
      createdAt: new Date().toISOString(),
    });

    log.info("need update posted", { needId: data.needId, kind: data.kind });
    return entry;
  }

  /** A case's book, oldest first — the order things happened in, which is
   *  the order it reads as a thread. */
  async listUpdates(needId: string): Promise<NeedUpdateDTO[]> {
    const row = needRows().find((candidate) => candidate.id === needId);
    if (!row) return [];

    return row.updates
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((update) =>
        needUpdateSchema.parse({
          id: update.id,
          kind: update.kind,
          name: update.name,
          phone: update.phone,
          note: update.note,
          createdAt: update.createdAt,
        }),
      );
  }

  /**
   * A curator closing a case by hand. Not the ordinary path — there is no
   * ordinary path any more, which is the point.
   *
   * This covers the two things a count cannot settle: a real case only one
   * person ever helped with, and a case that genuinely is fake.
   * `closed_rejected` in particular is why this is gated at all, because it
   * is the one outcome that calls somebody a liar. `deriveNeedState` honours
   * it: once a case is closed, no number of later entries moves it again.
   */
  async close(
    id: string,
    result: "closed_completed" | "closed_rejected",
  ): Promise<Partial<NeedDTO>> {
    if (!canCloseNeed(this.user)) throw new Error("Forbidden");

    log.info("need closed by curator", { needId: id, result, byUser: this.user!.id });
    return { status: result, confirmedAt: new Date().toISOString() };
  }

  /** Corrects a case's own category or description — anonymous, like
   *  reporting one. Never touches the contact fields. */
  async update(input: unknown): Promise<Partial<NeedDTO>> {
    const data = updateNeedSchema.parse(input);

    if (!canUpdateNeed()) throw new Error("Forbidden");

    const patch: Partial<NeedDTO> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.description !== undefined) patch.description = data.description;

    log.info("need updated", { needId: data.id, fields: Object.keys(patch) });
    return patch;
  }

  /**
   * Moves a case's pin to a corrected coordinate.
   *
   * Anybody may do it inside the case's own barrio; a curator may do it
   * anywhere in the covered area. See `canRelocate`. The barrio is re-derived
   * from the destination, never carried over.
   */
  async relocate(input: unknown): Promise<Partial<NeedDTO>> {
    const { id, longitude, latitude } = relocateNeedSchema.parse(input);

    const current = needRows().find((row) => row.id === id);
    const currentBarrio = current
      ? (resolveNeighborhood(current.longitude, current.latitude)?.id ?? null)
      : null;

    const target = resolveNeighborhood(longitude, latitude);

    if (!canRelocate(this.user, currentBarrio, target?.id ?? null)) {
      throw new Error(
        "Solo puedes mover el caso dentro de su propio barrio. Si está en el barrio equivocado, repórtalo.",
      );
    }

    log.info("need relocated", { needId: id, byUser: this.user?.id ?? "anon" });
    return { longitude, latitude, neighborhood: target?.name ?? null };
  }

  /** A curator hides or republishes a case — reversible, the same
   *  `published` flag every list filters by. */
  async setPublished(id: string, published: boolean): Promise<Partial<NeedDTO>> {
    if (!canManageNeed(this.user)) throw new Error("Forbidden");

    log.info("need visibility changed", {
      needId: id,
      published,
      byUser: this.user!.id,
    });
    return { published };
  }

  /** Removing a case outright — curators only, for spam and test rows. */
  async remove(id: string): Promise<void> {
    if (!canManageNeed(this.user)) throw new Error("Forbidden");

    log.info("need deleted", { needId: id, byUser: this.user!.id });
  }

  /**
   * Removing one entry from a case's book — curators only, for abuse, a
   * phone number that should not have been published, or spam.
   *
   * The book is append-only for everyone else, and that is what makes the
   * derived status trustworthy: anyone who could delete an entry could erase
   * the "sigue haciendo falta" keeping a case open.
   */
  async removeUpdate(id: string): Promise<void> {
    if (!canDeleteNeedUpdate(this.user)) throw new Error("Forbidden");

    log.info("need update deleted", { updateId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. */
  private toDTO(row: NeedRow): NeedDTO {
    return needSchema.parse({
      id: row.id,
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      // status, both counters and `reopened` all come from here — never from
      // the fixture, which carries only what people wrote.
      ...deriveNeedState(
        row.updates.map((update) => ({
          kind: update.kind as NeedUpdateDTO["kind"],
          createdAt: update.createdAt,
        })),
        row.closedStatus,
        row.createdAt,
      ),
      exactAddress: row.exactAddress,
      contactName: row.contactName,
      phone: row.phone,
      notes: row.notes,
      createdAt: row.createdAt,
      published: row.published,
    });
  }
}
