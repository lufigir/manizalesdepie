import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  createResourceOfferSchema,
  resourceOfferSchema,
  type ResourceOfferDTO,
} from "./resource_offer.dto";
import { canProposeResourceOffer } from "./resource_offer.policy";

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

    const { data, error } = await supabase
      .from("resource_offer_public")
      .select("*")
      .eq("published", true)
      .gt("expires_at", new Date().toISOString())
      .order("confirmed_at", { ascending: false });

    if (error) {
      log.error("resourceOffer.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los servicios");
    }

    return (data ?? []).map((row) => this.toDTO(row));
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
        quantity: data.quantity ?? null,
        area: data.area,
        location: hasPoint
          ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
          : null,
        whatsapp: data.whatsapp,
        available_from: data.availableFrom ?? null,
        available_until: data.availableUntil ?? null,
        published: true,
        expires_at:
          data.availableUntil ??
          new Date(
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

  /** Map explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): ResourceOfferDTO {
    return resourceOfferSchema.parse({
      id: row.id,
      type: row.type,
      description: row.description,
      quantity: row.quantity,
      area: row.area,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      whatsapp: row.whatsapp,
      availableFrom: row.available_from,
      availableUntil: row.available_until,
      verified: row.verified,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
      expiresAt: row.expires_at,
      createdById: row.created_by,
    });
  }
}
