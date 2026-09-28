import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";

import { resolveNeighborhoodId } from "@/data/geo/geo.dal";
import { canRelocate } from "@/data/geo/relocation.policy";

import {
  createSiteSchema,
  relocateSiteSchema,
  siteSchema,
  updateSiteSchema,
  updateSiteStatusSchema,
  type SiteDTO,
} from "./site.dto";
import {
  canConfirmSite,
  canEditSite,
  canManageSite,
  canProposeSite,
  canPublishSite,
} from "./site.policy";

/**
 * The only path from this application to the `sites` table.
 *
 * The private constructor is what makes that guarantee hold: an instance
 * cannot exist without a resolved authorization context, so every method runs
 * with a known identity. The two factories make the difference visible at the
 * call site — `SiteDAL.public()` says "this data is public" out loud, which is
 * much harder to get wrong by accident than an optional parameter.
 */
export class SiteDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  /** Authenticated context, for anything that writes. */
  static async create(): Promise<SiteDAL> {
    return new SiteDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): SiteDAL {
    return new SiteDAL(null);
  }

  /**
   * Every published site, newest confirmation first.
   *
   * Read through the session-bound client so row-level security applies: an
   * anonymous visitor sees published rows, a curator additionally sees the
   * pending queue. The filter is the database's job, not a WHERE clause we
   * could forget.
   */
  async listPublished(): Promise<SiteDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("sites_public")
      .select("*, items:site_items(id, label, mode, priority)");

    // A curator sees a site they hid too, marked on the card by
    // `AdminActions` — otherwise `setPublished(id, false)` would have no
    // way back short of a direct database query.
    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("confirmed_at", { ascending: false });

    if (error) {
      log.error("site.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los puntos");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One site, or null.
   *
   * This is what a shared link resolves to. It reads through the same
   * session-bound client as the map, so a link to something unpublished is a
   * 404 for a stranger and visible to a curator — the link carries no more
   * authority than the person opening it.
   */
  async findById(id: string): Promise<SiteDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("sites_public")
      .select("*, items:site_items(id, label, mode, priority)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("site.findById failed", { code: error.code, siteId: id });
      throw new Error("No se pudo cargar el punto");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Sites within `radiusMeters` of a point, nearest first. Backed by the
   * PostGIS `<->` operator against the GiST index.
   *
   * This is what the report form calls before creating anything: if there is
   * already a site 30 m away, the answer is "confirm that one", not "create a
   * second pin for the same coliseum".
   */
  async findNearby(
    longitude: number,
    latitude: number,
    radiusMeters = 50,
  ): Promise<{ id: string; name: string; type: string; distanceM: number }[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase.rpc("find_nearby_sites", {
      lng: longitude,
      lat: latitude,
      radius_m: radiusMeters,
    });

    if (error) {
      log.error("site.findNearby failed", { code: error.code });
      throw new Error("No se pudo verificar si ya existe un punto cercano");
    }

    return (data ?? []).map(
      (row: { id: string; name: string; type: string; distance_m: number }) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        distanceM: Math.round(row.distance_m),
      }),
    );
  }

  /**
   * Reports a site. It is on the map immediately.
   *
   * It used to land unpublished behind a curator. That gate was removed on
   * purpose: in a fast emergency the reviewer becomes the bottleneck and the
   * information arrives after it was needed. What replaces it is confidence
   * shown rather than enforced — a new report reads "sin confirmar" until
   * people vouch for it, and a curator can still take it down.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async propose(input: unknown): Promise<{ id: string }> {
    const data = createSiteSchema.parse(input);

    if (!canProposeSite()) throw new Error("Forbidden");

    // Runs as the caller: RLS grants anon/authenticated INSERT on exactly
    // these columns (20260820010000), and `published` is left out of the
    // payload entirely — the column defaults to true, which is what "on the
    // map immediately" already meant. Sending it explicitly would need a
    // grant this migration deliberately does not hand to a non-curator.
    const supabase = await createServerSupabase();
    const { data: row, error } = await supabase
      .from("sites")
      .insert({
        type: data.type,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        schedule: data.schedule ?? null,
        whatsapp: data.whatsapp ?? null,
        created_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("site.propose failed", { code: error?.code });
      throw new Error("No se pudo guardar el punto");
    }

    log.info("site proposed", { siteId: row.id, byUser: this.user?.id ?? "anon" });
    return { id: row.id };
  }

  /**
   * Makes a site visible to the city. Curators only.
   *
   * Stays on the service-role client: RLS *can* let a curator's own session
   * do this — `sites_update_anyone` plus the `published` grant on
   * `authenticated` and `forbid_publish_toggle_by_non_curator` all allow it
   * — but the admin client is what every other curator action here already
   * uses, and there is no reason for this one alone to depend on the
   * caller's session still being fresh mid-review.
   */
  async publish(id: string): Promise<void> {
    if (!canPublishSite(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("sites")
      .update({ published: true, confirmed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      log.error("site.publish failed", { code: error.code, siteId: id });
      throw new Error("No se pudo publicar el punto");
    }

    log.info("site published", { siteId: id, byUser: this.user?.id });
  }

  /**
   * Someone stood in front of the place and told us what they saw. Resets the
   * freshness clock and logs the confirmation, which is the mechanism that
   * keeps this map from becoming a list of places that closed last Tuesday.
   */
  async confirmStatus(input: unknown): Promise<void> {
    const { id, status } = updateSiteStatusSchema.parse(input);

    if (!canConfirmSite()) throw new Error("Forbidden");

    // Stays on the service-role client. `confirmed_at` is exactly the
    // column 20260820000000 stopped letting anon/authenticated touch — it
    // is what `confirmation_bumps_count` used to let a stranger spin in a
    // loop — so 20260820010000 grants neither `status` nor `confirmed_at`
    // on `sites` to anyone. This method still needs to write both, plus the
    // `site_confirmations` row right after, and that table has carried no
    // anon/authenticated INSERT grant since the same migration. Splitting
    // the two writes across two clients would only add a place for them to
    // disagree.
    const supabase = createAdminSupabase();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("sites")
      .update({
        status,
        confirmed_at: now,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", id);

    if (error) {
      log.error("site.confirmStatus failed", { code: error.code, siteId: id });
      throw new Error("No se pudo confirmar el estado");
    }

    await supabase.from("site_confirmations").insert({
      // `site_id` is the whole relationship. The table still carries the old
      // `entity`/`entity_id` pair, but 20260818040000 made them nullable so
      // nothing has to write them any more; the contract migration drops them
      // as dead columns, with no deploy that has to land at the same moment.
      site_id: id,
      result: status === "closed" ? "no_longer_valid" : "still_valid",
      // Anonymous confirmations are the common case now, so the signature is
      // optional. An unsigned row still counts; it just carries no name.
      created_by: this.user?.id ?? null,
    });
  }

  /** Corrects a site's own fields. Open to anyone — see `canEditSite`.
   *  Never the coordinate: that is `relocate` above. */
  async update(input: unknown): Promise<void> {
    const data = updateSiteSchema.parse(input);

    if (!canEditSite()) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.address !== undefined) patch.address = data.address;
    if (data.schedule !== undefined) patch.schedule = data.schedule;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length === 0) return;

    // Runs as the caller: 20260820010000 grants anon/authenticated UPDATE
    // on exactly these six columns, so this is the whole authorization
    // surface — there is no `published`/`status`/coordinate in `patch` for
    // RLS to have to reject.
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("sites").update(patch).eq("id", data.id);

    if (error) {
      log.error("site.update failed", { code: error.code, siteId: data.id });
      throw new Error("No se pudo actualizar el punto");
    }

    log.info("site updated", {
      siteId: data.id,
      fields: Object.keys(patch),
      byUser: this.user?.id ?? "anon",
    });
  }

  /**
   * Moves a site's pin to a corrected coordinate.
   *
   * Anybody may do it inside the pin's own barrio; a curator may do it
   * anywhere in the covered area. See `canRelocate` for why the rule is that
   * shape rather than curator-only.
   *
   * The barrio is NOT written here. `site_sets_neighborhood` re-derives it
   * from the new point, the same trigger that stamped it on insert, so the
   * name in the panel and the pin on the map cannot disagree. That is also
   * why `neighborhood_id` stays out of the patch: the trigger returns early
   * when an update changes it by hand, which would pin the old barrio onto
   * the new coordinate.
   *
   * Order, as in every mutation: validate input → authorize → mutate.
   */
  async relocate(input: unknown): Promise<void> {
    const { id, longitude, latitude } = relocateSiteSchema.parse(input);

    // Stays on the service-role client, and has to: `canRelocate` needs the
    // pin's CURRENT barrio to authorize the move, so this method reads
    // `neighborhood_id` before it knows whether the caller may write
    // anything at all. RLS can gate a write against the row being written,
    // not against a value read earlier in the same request — there is no
    // policy shape for "allowed only if a fact resolved two queries ago
    // says so". `location` also carries no anon/authenticated UPDATE grant
    // at all (20260820010000), so the session-bound client could not make
    // this write regardless.
    const supabase = createAdminSupabase();

    const { data: current, error: readError } = await supabase
      .from("sites")
      .select("neighborhood_id")
      .eq("id", id)
      .maybeSingle();

    if (readError || !current) {
      log.error("site.relocate lookup failed", { code: readError?.code, siteId: id });
      throw new Error("No se pudo encontrar el punto");
    }

    const target = await resolveNeighborhoodId(longitude, latitude);

    if (!canRelocate(this.user, current.neighborhood_id, target)) {
      throw new Error(
        "Solo puedes mover el punto dentro de su propio barrio. Si está en el barrio equivocado, repórtalo.",
      );
    }

    const { error } = await supabase
      .from("sites")
      .update({ location: `SRID=4326;POINT(${longitude} ${latitude})` })
      .eq("id", id);

    if (error) {
      log.error("site.relocate failed", { code: error.code, siteId: id });
      throw new Error("No se pudo mover el punto");
    }

    log.info("site relocated", { siteId: id, byUser: this.user?.id ?? "anon" });
  }

  /** A curator hides or republishes a site — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    // Curator-only, like every other manage/publish/remove method here —
    // stays on the service-role client for the same reason `publish` does.
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("sites").update({ published }).eq("id", id);

    if (error) {
      log.error("site.setPublished failed", { code: error.code, siteId: id });
      throw new Error("No se pudo cambiar la visibilidad del punto");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. Cascades
   *  to `site_items`. */
  async remove(id: string): Promise<void> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client for the same reason
    // as `publish` and `setPublished` above.
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("sites").delete().eq("id", id);

    if (error) {
      log.error("site.remove failed", { code: error.code, siteId: id });
      throw new Error("No se pudo eliminar el punto");
    }

    log.info("site deleted", { siteId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. A column added tomorrow stays server-side
   *  until someone deliberately adds it here and to the schema. */
  private toDTO(row: Record<string, unknown>): SiteDTO {
    return siteSchema.parse({
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      address: row.address,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      status: row.status,
      schedule: row.schedule,
      whatsapp: row.whatsapp,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
      expiresAt: row.expires_at,
      items: row.items ?? [],
      published: row.published,
    });
  }
}
