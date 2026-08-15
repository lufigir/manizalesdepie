import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  adminUpdateResourceOfferSchema,
  createResourceOfferSchema,
  resourceOfferSchema,
  type ResourceOfferDTO,
} from "./resource_offer.dto";
import {
  canManageResourceOffer,
  canProposeResourceOffer,
} from "./resource_offer.policy";

/** An offer with no stated end is worth showing for a while, not forever —
 *  long enough that "tengo una volqueta" is not gone by lunch, short enough
 *  that it eventually asks to be confirmed like everything else here. */
const DEFAULT_AVAILABILITY_DAYS = 7;

/**
 * The only path from this application to `resource_offer`.
 *
 * Private constructor and static factories, like every other DAL here. This
 * one never actually needs an authenticated context — `propose` follows
 * `SiteDAL.propose`'s rule, not `CallDAL.convene`'s — but it resolves the
 * user anyway so a signed-in offerer's `created_by` still gets recorded.
 */
export class ResourceOfferDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  static async create(): Promise<ResourceOfferDAL> {
    return new ResourceOfferDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): ResourceOfferDAL {
    return new ResourceOfferDAL(null);
  }

  /** Every offer still worth showing, most recently confirmed first — same
   *  ordering as a site, for the same reason: nothing here has an hour of
   *  its own to sort by. */
  async listPublished(): Promise<ResourceOfferDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("resource_offer_public")
      .select("*")
      .gt("expires_at", new Date().toISOString());

    // A curator sees an offer they hid too, marked on the card by
    // `AdminActions` — otherwise `setPublished(id, false)` would have no
    // way back short of a direct database query.
    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("confirmed_at", { ascending: false });

    if (error) {
      log.error("resourceOffer.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los servicios");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One offer, or null.
   *
   * What a shared link resolves to — `/servicio/[id]`. Session-bound like
   * every other `findById` here, so a hidden offer is a 404 for a stranger
   * and still reachable by the curator who hid it.
   *
   * Deliberately not filtered by `expires_at`, unlike `listPublished`. A link
   * outlives the week the offer was published for, and "esta volqueta ya no
   * está disponible" is a better landing than an empty map — the card says
   * how stale it is (see `freshness`) and the reader decides.
   */
  async findById(id: string): Promise<ResourceOfferDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("resource_offer_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("resourceOffer.findById failed", { code: error.code, offerId: id });
      throw new Error("No se pudo cargar el servicio");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Offers a resource. On the map immediately, like a site report.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async propose(input: unknown): Promise<{ id: string }> {
    const data = createResourceOfferSchema.parse(input);

    if (!canProposeResourceOffer()) throw new Error("Forbidden");

    const hasPoint = data.longitude !== undefined && data.latitude !== undefined;

    const supabase = createAdminSupabase();
    const { data: row, error } = await supabase
      .from("resource_offer")
      .insert({
        type: data.type,
        description: data.description,
        area: data.area,
        location: hasPoint
          ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
          : null,
        whatsapp: data.whatsapp,
        published: true,
        // The form used to ask "¿hasta cuándo?" and take the answer as the
        // expiry. Nobody answered it, 46 times out of 46, so the window is
        // the only thing left setting it.
        expires_at: new Date(
          Date.now() + DEFAULT_AVAILABILITY_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("resourceOffer.propose failed", { code: error?.code });
      throw new Error("No se pudo publicar el servicio");
    }

    log.info("resource offer proposed", {
      resourceOfferId: row.id,
      byUser: this.user?.id ?? "anon",
    });
    return { id: row.id };
  }

  /** A curator corrects any of an offer's own fields — never the point,
   *  see `adminUpdateResourceOfferSchema`. */
  async adminUpdate(input: unknown): Promise<void> {
    const data = adminUpdateResourceOfferSchema.parse(input);

    if (!canManageResourceOffer(this.user)) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.description !== undefined) patch.description = data.description;
    if (data.area !== undefined) patch.area = data.area;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length === 0) return;

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("resource_offer")
      .update(patch)
      .eq("id", data.id);

    if (error) {
      log.error("resourceOffer.adminUpdate failed", {
        code: error.code,
        resourceOfferId: data.id,
      });
      throw new Error("No se pudo actualizar el servicio");
    }

    log.info("resource offer admin-updated", {
      resourceOfferId: data.id,
      fields: Object.keys(patch),
    });
  }

  /** A curator hides or republishes an offer — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageResourceOffer(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("resource_offer")
      .update({ published })
      .eq("id", id);

    if (error) {
      log.error("resourceOffer.setPublished failed", {
        code: error.code,
        resourceOfferId: id,
      });
      throw new Error("No se pudo cambiar la visibilidad del servicio");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. */
  async remove(id: string): Promise<void> {
    if (!canManageResourceOffer(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("resource_offer").delete().eq("id", id);

    if (error) {
      log.error("resourceOffer.remove failed", { code: error.code, resourceOfferId: id });
      throw new Error("No se pudo eliminar el servicio");
    }

    log.info("resource offer deleted", { resourceOfferId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): ResourceOfferDTO {
    return resourceOfferSchema.parse({
      id: row.id,
      type: row.type,
      description: row.description,
      area: row.area,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      whatsapp: row.whatsapp,
      confirmedAt: row.confirmed_at,
      expiresAt: row.expires_at,
      createdById: row.created_by,
      published: row.published,
    });
  }
}
