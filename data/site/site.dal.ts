import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";

import {
  adminUpdateSiteSchema,
  createSiteSchema,
  siteSchema,
  updateSiteStatusSchema,
  type SiteDTO,
} from "./site.dto";
import {
  canConfirmSite,
  canManageSite,
  canProposeSite,
  canPublishSite,
} from "./site.policy";

/**
 * The only path from this application to the `site` table.
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
      .from("site_public")
      .select("*, items:site_item(id, label, mode, priority)");

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
      .from("site_public")
      .select("*, items:site_item(id, label, mode, priority)")
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

    const supabase = createAdminSupabase();
    const { data: row, error } = await supabase
      .from("site")
      .insert({
        type: data.type,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        schedule: data.schedule ?? null,
        whatsapp: data.whatsapp ?? null,
        published: true,
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

  /** Makes a site visible to the city. Curators only. */
  async publish(id: string): Promise<void> {
    if (!canPublishSite(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("site")
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

    const supabase = createAdminSupabase();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("site")
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

    await supabase.from("confirmation").insert({
      entity: "site",
      entity_id: id,
      result: status === "closed" ? "no_longer_valid" : "still_valid",
      // Anonymous confirmations are the common case now, so the signature is
      // optional. An unsigned row still counts; it just carries no name.
      created_by: this.user?.id ?? null,
    });
  }

  /** A curator corrects any of a site's own fields. Never the coordinate —
   *  see the note on `adminUpdateSiteSchema`. */
  async adminUpdate(input: unknown): Promise<void> {
    const data = adminUpdateSiteSchema.parse(input);

    if (!canManageSite(this.user)) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.address !== undefined) patch.address = data.address;
    if (data.schedule !== undefined) patch.schedule = data.schedule;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length === 0) return;

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("site").update(patch).eq("id", data.id);

    if (error) {
      log.error("site.adminUpdate failed", { code: error.code, siteId: data.id });
      throw new Error("No se pudo actualizar el punto");
    }

    log.info("site admin-updated", { siteId: data.id, fields: Object.keys(patch) });
  }

  /** A curator hides or republishes a site — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("site").update({ published }).eq("id", id);

    if (error) {
      log.error("site.setPublished failed", { code: error.code, siteId: id });
      throw new Error("No se pudo cambiar la visibilidad del punto");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. Cascades
   *  to `site_item`. */
  async remove(id: string): Promise<void> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("site").delete().eq("id", id);

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
