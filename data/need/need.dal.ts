import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import { resolveNeighborhoodId } from "@/data/geo/geo.dal";
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
} from "./need.policy";

/** How long a closed case stays on the public map before it drops off on
 *  its own. Long enough that someone already on the way still sees it and a
 *  wrong "cerrado" is easy to catch and undo; short enough that the map
 *  does not fill up with resolved cases nobody needs to see any more.
 *
 *  Duplicated as a literal in `sync_need_state`, which is where the
 *  ordinary close happens now. This copy only covers a curator's manual one. */
const CLOSED_VISIBLE_HOURS = 6;

/**
 * The only path from this application to `needs` and `need_updates`.
 *
 * A need's contact fields live on `needs` itself and are public, so there is
 * no second visibility rule to keep and no reveal left to audit.
 *
 * Private constructor and static factories, like `SiteDAL` — kept even
 * though most methods here no longer need an identity, because `close`
 * still does, and a class with a public constructor would let that one slip
 * through unauthenticated by accident.
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

  /** Every open or recently-closed need, most recently confirmed
   *  first. `needs_public` already excludes rows merged into another;
   *  this also drops a closed case once `expires_at` has passed — see
   *  `CLOSED_VISIBLE_HOURS`.
   *
   *  A curator sees hidden cases too, distinguished on the card by
   *  `AdminActions` — otherwise `setPublished(id, false)` would have no way
   *  back short of a direct database query. Anyone else only ever sees
   *  `published = true`, same as before. */
  async listPublished(): Promise<NeedDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("needs_public")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("confirmed_at", { ascending: false });

    if (error) {
      log.error("need.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar las necesidades");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One case, or null. What a shared link resolves to.
   *
   * Not filtered by `expires_at`, unlike `listPublished`: a link posted in a
   * WhatsApp group outlives the case it points at, and "ya se resolvió" on
   * the card is a better answer than a 404 for someone arriving late.
   */
  async findById(id: string): Promise<NeedDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("needs_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("need.findById failed", { code: error.code, needId: id });
      throw new Error("No se pudo cargar la necesidad");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Reports debris, a structural risk, whatever needs a volqueta or a pair
   * of hands. Anonymous, on the map immediately.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async report(input: unknown): Promise<{ id: string }> {
    const data = createNeedSchema.parse(input);

    if (!canReportNeed()) throw new Error("Forbidden");

    // Runs as the caller: RLS grants anon/authenticated INSERT on exactly
    // these columns (20260820010000). `status` is never in this payload —
    // it is not even a column the grant covers — `published` is left out
    // for the same reason as `SiteDAL.propose`: the column defaults to
    // true.
    const supabase = await createServerSupabase();
    const { data: row, error } = await supabase
      .from("needs")
      .insert({
        category: data.category,
        description: data.description,
        location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        created_by: this.user?.id ?? null,
        // One insert now, not two. The contact fields used to be written to
        // a separate table because they had a different visibility rule;
        // they have the same one as the description now.
        exact_address: data.exactAddress ?? null,
        contact_name: data.contactName ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("need.report failed", { code: error?.code });
      throw new Error("No se pudo publicar la necesidad");
    }

    log.info("need reported", {
      needId: row.id,
      byUser: this.user?.id ?? "anon",
    });
    return { id: row.id };
  }

  /**
   * Adds one entry to a case's book — anonymous, no account, several people
   * per case, each leaving a note for the others.
   *
   * Note what this does NOT do: set a status. The insert lands and
   * `sync_need_state` reads the case's state back out of every entry
   * on it. That is the whole point of the redesign — one person can say what
   * they did, and no person can decide what the case is.
   */
  async postUpdate(input: unknown): Promise<void> {
    const data = postNeedUpdateSchema.parse(input);

    if (!canPostNeedUpdate()) throw new Error("Forbidden");

    // Runs as the caller: `need_updates` grants anon/authenticated INSERT
    // on exactly these five columns (20260820010000). `sync_need_state`
    // itself runs `security definer`, so it derives `status` regardless of
    // which client made this insert.
    const supabase = await createServerSupabase();

    const { error } = await supabase.from("need_updates").insert({
      need_id: data.needId,
      kind: data.kind,
      name: data.name ?? null,
      phone: data.phone ?? null,
      note: data.note,
    });

    if (error) {
      log.error("need.postUpdate failed", {
        code: error.code,
        needId: data.needId,
        kind: data.kind,
      });
      throw new Error("No se pudo registrar lo que escribiste");
    }

    log.info("need update posted", {
      needId: data.needId,
      kind: data.kind,
    });
  }

  /** A case's book, oldest first — the order things happened in, which is
   *  the order it reads as a thread. */
  async listUpdates(needId: string): Promise<NeedUpdateDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("need_updates_public")
      .select("id, kind, name, phone, note, created_at")
      .eq("need_id", needId)
      .order("created_at", { ascending: true });

    if (error) {
      log.error("need.listUpdates failed", { code: error.code, needId });
      throw new Error("No se pudo cargar lo que ha pasado con este caso");
    }

    return (data ?? []).map((row) =>
      needUpdateSchema.parse({
        id: row.id,
        kind: row.kind,
        name: row.name,
        phone: row.phone,
        note: row.note,
        createdAt: row.created_at,
      }),
    );
  }

  /**
   * A curator closing a case by hand. Not the ordinary path.
   *
   * The ordinary path is the threshold in `sync_need_state`: two "ya
   * ayudé" from two different numbers. This covers the two things a count
   * cannot settle — a real case only one person ever helped with, and a
   * case that genuinely is fake — and `closed_rejected` in particular is
   * why this is gated at all, because it is the one outcome that calls
   * somebody a liar. The trigger honours it: once a case is rejected, no
   * number of later entries moves it again.
   */
  async close(
    id: string,
    result: "closed_completed" | "closed_rejected",
  ): Promise<void> {
    if (!canCloseNeed(this.user)) throw new Error("Forbidden");

    // Stays on the service-role client, and has to: `needs.status` carries
    // no anon/authenticated grant at all, for either role, under any
    // condition — see 20260820010000. That is the point of the redesign
    // this method is the one deliberate exception to: nothing in this
    // application writes `status` except this curator override and the
    // `security definer` trigger that derives it from `need_updates`.
    // Opening a `status` grant, even one gated to `authenticated` and
    // `is_curator()` the way `published` is, would put a second writer next
    // to `sync_need_state` for the one column this schema promises has
    // only one.
    const supabase = createAdminSupabase();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + CLOSED_VISIBLE_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await supabase
      .from("needs")
      .update({ status: result, closed_at: now.toISOString(), expires_at: expiresAt })
      .eq("id", id);

    if (error) {
      log.error("need.close failed", { code: error.code, needId: id });
      throw new Error("No se pudo cerrar la necesidad");
    }

    log.info("need closed by curator", {
      needId: id,
      result,
      byUser: this.user!.id,
    });
  }

  /** Corrects a case's own category or description — anonymous, like
   *  reporting one. Never touches the contact fields. */
  async update(input: unknown): Promise<void> {
    const data = updateNeedSchema.parse(input);

    if (!canUpdateNeed()) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.description !== undefined) patch.description = data.description;
    if (Object.keys(patch).length === 0) return;

    // Runs as the caller: `needs` grants anon/authenticated UPDATE on only
    // `category` and `description` (20260820010000), which is the whole
    // contents of `patch` by construction.
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("needs").update(patch).eq("id", data.id);

    if (error) {
      log.error("need.update failed", { code: error.code, needId: data.id });
      throw new Error("No se pudo actualizar la necesidad");
    }

    log.info("need updated", { needId: data.id, fields: Object.keys(patch) });
  }

  /**
   * Moves a case's pin to a corrected coordinate.
   *
   * Anybody may do it inside the case's own barrio; a curator may do it
   * anywhere in the covered area. See `canRelocate`.
   *
   * The barrio is re-derived by `need_sets_neighborhood` from the new
   * point, which is why `neighborhood_id` stays out of the patch: that
   * trigger returns early when an update changes it by hand, and it would
   * then keep the old barrio stamped on the new coordinate.
   */
  async relocate(input: unknown): Promise<void> {
    const { id, longitude, latitude } = relocateNeedSchema.parse(input);

    // Stays on the service-role client — same reason as `SiteDAL.relocate`:
    // `canRelocate` needs the case's current barrio, read before this
    // method knows whether the caller may write anything, which is not
    // something an RLS policy can condition on. `location` also carries no
    // anon/authenticated UPDATE grant on `needs` at all.
    const supabase = createAdminSupabase();

    const { data: current, error: readError } = await supabase
      .from("needs")
      .select("neighborhood_id")
      .eq("id", id)
      .maybeSingle();

    if (readError || !current) {
      log.error("need.relocate lookup failed", {
        code: readError?.code,
        needId: id,
      });
      throw new Error("No se pudo encontrar el caso");
    }

    const target = await resolveNeighborhoodId(longitude, latitude);

    if (!canRelocate(this.user, current.neighborhood_id, target)) {
      throw new Error(
        "Solo puedes mover el caso dentro de su propio barrio. Si está en el barrio equivocado, repórtalo.",
      );
    }

    const { error } = await supabase
      .from("needs")
      .update({ location: `SRID=4326;POINT(${longitude} ${latitude})` })
      .eq("id", id);

    if (error) {
      log.error("need.relocate failed", { code: error.code, needId: id });
      throw new Error("No se pudo mover el caso");
    }

    log.info("need relocated", {
      needId: id,
      byUser: this.user?.id ?? "anon",
    });
  }

  /** A curator hides or republishes a case — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageNeed(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client, same as every other
    // manage/publish/remove method in this codebase.
    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("needs")
      .update({ published })
      .eq("id", id);

    if (error) {
      log.error("need.setPublished failed", { code: error.code, needId: id });
      throw new Error("No se pudo cambiar la visibilidad del caso");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. Cascades
   *  to `need_updates`. */
  async remove(id: string): Promise<void> {
    if (!canManageNeed(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client.
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("needs").delete().eq("id", id);

    if (error) {
      log.error("need.remove failed", { code: error.code, needId: id });
      throw new Error("No se pudo eliminar el caso");
    }

    log.info("need deleted", { needId: id, byUser: this.user!.id });
  }

  /**
   * Removing one entry from a case's book — curators only, for abuse, a
   * phone number that should not have been published, or spam.
   *
   * Deleting the row re-fires `sync_need_state` (the trigger is on `after
   * insert or delete`), so `status`, `reopened` and both counts recompute
   * from whatever entries remain. That is the whole reason this goes
   * through a plain delete rather than a soft-delete flag: a tombstoned row
   * would still be counted by the trigger, and a case could stay closed on
   * the strength of an entry nobody can see any more.
   */
  async removeUpdate(id: string): Promise<void> {
    if (!canDeleteNeedUpdate(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client.
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("need_updates").delete().eq("id", id);

    if (error) {
      log.error("need.removeUpdate failed", { code: error.code, updateId: id });
      throw new Error("No se pudo eliminar la nota");
    }

    log.info("need update deleted", { updateId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): NeedDTO {
    return needSchema.parse({
      id: row.id,
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      status: row.status,
      onTheWayCount: row.on_the_way_count,
      helpedCount: row.helped_count,
      reopened: row.reopened,
      exactAddress: row.exact_address,
      contactName: row.contact_name,
      phone: row.phone,
      notes: row.notes,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
      published: row.published,
    });
  }
}
