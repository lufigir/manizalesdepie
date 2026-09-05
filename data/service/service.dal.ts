import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/current-user";
import { log } from "@/lib/log";
import { services as serviceRows, type ServiceRow } from "@/lib/demo/dataset";

import { resolveNeighborhood } from "@/data/geo/geo.dal";

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

/** A service with no stated end is worth showing for a while, not forever —
 *  long enough that "tengo una volqueta" is not gone by lunch, short enough
 *  that it eventually asks to be confirmed like everything else here. */
const DEFAULT_AVAILABILITY_DAYS = 7;

/**
 * The only path from this application to the services.
 *
 * Private constructor and static factories, like every other DAL here. This
 * one never actually needs an authenticated context — `propose` follows
 * `SiteDAL.propose`'s rule — but it resolves the reader anyway so a curator's
 * own view still reaches it.
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
    const curator = this.user?.role === "curator";
    const now = new Date().toISOString();

    return serviceRows()
      .filter((row) => (curator || row.published) && row.expiresAt > now)
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
      .map((row) => this.toDTO(row));
  }

  /**
   * One service, or null. What `/servicio/[id]` resolves to.
   *
   * Deliberately not filtered by expiry, unlike the list: a link outlives the
   * week the service was published for, and "esta volqueta ya no está
   * disponible" is a better landing than an empty map — the card says how
   * stale it is and the reader decides.
   */
  async findById(id: string): Promise<ServiceDTO | null> {
    const curator = this.user?.role === "curator";
    const row = serviceRows().find((candidate) => candidate.id === id);

    if (!row || (!row.published && !curator)) return null;

    return this.toDTO(row);
  }

  /**
   * Offers a service. On the map immediately, like a site report.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async propose(input: unknown): Promise<ServiceDTO> {
    const data = createServiceSchema.parse(input);

    if (!canProposeService()) throw new Error("Forbidden");

    const now = new Date();
    const hasPoint = data.longitude !== undefined && data.latitude !== undefined;

    const service = serviceSchema.parse({
      id: crypto.randomUUID(),
      type: data.type,
      description: data.description,
      area: data.area,
      longitude: data.longitude ?? null,
      latitude: data.latitude ?? null,
      neighborhood: hasPoint
        ? (resolveNeighborhood(data.longitude!, data.latitude!)?.name ?? null)
        : null,
      whatsapp: data.whatsapp,
      confirmedAt: now.toISOString(),
      // The form used to ask "¿hasta cuándo?" and take the answer as the
      // expiry. Nobody answered it, 46 times out of 46, so the window is the
      // only thing left setting it.
      expiresAt: new Date(
        now.getTime() + DEFAULT_AVAILABILITY_DAYS * 24 * 3_600_000,
      ).toISOString(),
      createdById: this.user?.id ?? null,
      published: true,
    });

    log.info("service proposed", {
      serviceId: service.id,
      byUser: this.user?.id ?? "anon",
    });
    return service;
  }

  /** Corrects a service's own fields. Open to anyone — see
   *  `canEditService`. Never the point. */
  async update(input: unknown): Promise<Partial<ServiceDTO>> {
    const data = updateServiceSchema.parse(input);

    if (!canEditService()) throw new Error("Forbidden");

    const patch: Partial<ServiceDTO> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.description !== undefined) patch.description = data.description;
    if (data.area !== undefined) patch.area = data.area;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;

    log.info("service updated", {
      serviceId: data.id,
      fields: Object.keys(patch),
      byUser: this.user?.id ?? "anon",
    });

    return patch;
  }

  /** A curator hides or republishes a service — reversible, the same
   *  `published` flag every list filters by. */
  async setPublished(
    id: string,
    published: boolean,
  ): Promise<Partial<ServiceDTO>> {
    if (!canManageService(this.user)) throw new Error("Forbidden");

    log.info("service visibility changed", {
      serviceId: id,
      published,
      byUser: this.user!.id,
    });
    return { published };
  }

  /** Removing a service outright — curators only, for spam and test rows. */
  async remove(id: string): Promise<void> {
    if (!canManageService(this.user)) throw new Error("Forbidden");

    log.info("service deleted", { serviceId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. */
  private toDTO(row: ServiceRow): ServiceDTO {
    return serviceSchema.parse({
      id: row.id,
      type: row.type,
      description: row.description,
      area: row.area,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      whatsapp: row.whatsapp,
      confirmedAt: row.confirmedAt,
      expiresAt: row.expiresAt,
      createdById: null,
      published: row.published,
    });
  }
}
