import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  createServiceSchema,
  serviceSchema,
  updateServiceSchema,
  type ServiceDTO,
} from "./service.dto";
import {
  canEditService,
  canManageService,
  canProposeService,
} from "./service.policy";

/**
 * The only path from this application to `services`.
 *
 * Private constructor and static factories, like every other DAL here. This
 * one never actually needs an authenticated context — `propose` follows
 * `SiteDAL.propose`'s rule — but it resolves the user anyway so a signed-in
 * offerer's `created_by` still gets recorded.
 */
export class ServiceDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  static async create(): Promise<ServiceDAL> {
    return new ServiceDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): ServiceDAL {
    return new ServiceDAL(null);
  }

  /** Every service still worth showing, most recently confirmed first — same
   *  ordering as a site, for the same reason: nothing here has an hour of
   *  its own to sort by. */
  async listPublished(): Promise<ServiceDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("services_public")
      .select("*")
      .gt("expires_at", new Date().toISOString());

    // A curator sees a service they hid too, marked on the card by
    // `AdminActions` — otherwise `setPublished(id, false)` would have no
    // way back short of a direct database query.
    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("confirmed_at", { ascending: false });

    if (error) {
      log.error("service.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los servicios");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One service, or null.
   *
   * What a shared link resolves to — `/servicio/[id]`. Session-bound like
   * every other `findById` here, so a hidden service is a 404 for a
   * stranger and still reachable by the curator who hid it.
   *
   * Deliberately not filtered by `expires_at`, unlike `listPublished`. A link
   * outlives the week the service was published for, and "esta volqueta ya
   * no está disponible" is a better landing than an empty map — the card
   * says how stale it is (see `freshness`) and the reader decides.
   */
  async findById(id: string): Promise<ServiceDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("services_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("service.findById failed", { code: error.code, serviceId: id });
      throw new Error("No se pudo cargar el servicio");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Offers a service. On the map immediately, like a site report.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async propose(input: unknown): Promise<{ id: string }> {
    const data = createServiceSchema.parse(input);

    if (!canProposeService()) throw new Error("Forbidden");

    const hasPoint = data.longitude !== undefined && data.latitude !== undefined;

    // Runs as the caller: RLS grants anon/authenticated INSERT on exactly
    // these columns (20260820010000). `expires_at` is no longer sent here —
    // "a service with no stated end is worth showing for a while, not
    // forever" now lives as the column's own `now() + 7 days` default
    // (20260820010000) rather than a literal this method computed by hand,
    // so it never needed a client-facing grant at all. `published` is left
    // out for the same reason as `SiteDAL.propose`.
    const supabase = await createServerSupabase();
    const { data: row, error } = await supabase
      .from("services")
      .insert({
        type: data.type,
        description: data.description,
        area: data.area,
        location: hasPoint
          ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
          : null,
        whatsapp: data.whatsapp,
        created_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("service.propose failed", { code: error?.code });
      throw new Error("No se pudo publicar el servicio");
    }

    log.info("service proposed", {
      serviceId: row.id,
      byUser: this.user?.id ?? "anon",
    });
    return { id: row.id };
  }

  /** Corrects a service's own fields. Open to anyone — see
   *  `canEditService`. Never the point. */
  async update(input: unknown): Promise<void> {
    const data = updateServiceSchema.parse(input);

    if (!canEditService()) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.description !== undefined) patch.description = data.description;
    if (data.area !== undefined) patch.area = data.area;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length === 0) return;

    // Runs as the caller: `services` grants anon/authenticated UPDATE on
    // exactly these four columns (20260820010000).
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("services")
      .update(patch)
      .eq("id", data.id);

    if (error) {
      log.error("service.update failed", {
        code: error.code,
        serviceId: data.id,
      });
      throw new Error("No se pudo actualizar el servicio");
    }

    log.info("service updated", {
      serviceId: data.id,
      fields: Object.keys(patch),
      byUser: this.user?.id ?? "anon",
    });
  }

  /** A curator hides or republishes a service — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageService(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client, same as every other
    // manage/publish/remove method in this codebase.
    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("services")
      .update({ published })
      .eq("id", id);

    if (error) {
      log.error("service.setPublished failed", {
        code: error.code,
        serviceId: id,
      });
      throw new Error("No se pudo cambiar la visibilidad del servicio");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. */
  async remove(id: string): Promise<void> {
    if (!canManageService(this.user)) throw new Error("Forbidden");

    // Curator-only — stays on the service-role client.
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      log.error("service.remove failed", { code: error.code, serviceId: id });
      throw new Error("No se pudo eliminar el servicio");
    }

    log.info("service deleted", { serviceId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): ServiceDTO {
    return serviceSchema.parse({
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
