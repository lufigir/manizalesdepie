import "server-only";

import {
  distanceMeters,
  sites as siteRows,
  type SiteRow,
} from "@/lib/demo/dataset";
import { log } from "@/lib/log";
import { getCurrentUser, type CurrentUser } from "@/data/user/current-user";

import { resolveNeighborhood } from "@/data/geo/geo.dal";
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

/** How long a confirmation keeps a site fresh. The database wrote this into
 *  `expires_at` on every confirmation; it is the same 24 hours. */
const FRESH_HOURS = 24;

/**
 * The only path from this application to the sites.
 *
 * It used to be the only path to the `sites` table, through PostgREST and
 * row-level security. The table is gone — see `lib/demo/dataset.ts` — and the
 * shape of this class is not, because the shape was never about Postgres.
 * The private constructor is what guarantees an instance cannot exist without
 * a resolved authorization context, so every method below runs with a known
 * identity; the two factories make the difference visible at the call site,
 * where `SiteDAL.public()` says "this data is public" out loud.
 *
 * What the demo changed is the far side of every mutation. There is nothing
 * to write to, so a mutation validates, authorizes, and RETURNS the row it
 * would have written; the browser holds it for the rest of the visit (see
 * `demo-store.tsx`). Which means the order below is unchanged and still the
 * rule: validate input → authorize → mutate → validate output.
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
   * The `published` filter was row-level security's job and is this line's
   * now — the one thing lost with the database that had to be replaced by
   * hand rather than deleted. A curator sees a site they hid too, marked on
   * the card by `AdminActions`; otherwise `setPublished(id, false)` would
   * have no way back.
   */
  async listPublished(): Promise<SiteDTO[]> {
    const curator = this.user?.role === "curator";

    return siteRows()
      .filter((row) => curator || row.published)
      .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt))
      .map((row) => this.toDTO(row));
  }

  /**
   * One site, or null. What a shared link resolves to.
   *
   * Hidden rows resolve for a curator and 404 for everyone else, exactly as
   * the list above: the link carries no more authority than the person
   * opening it.
   */
  async findById(id: string): Promise<SiteDTO | null> {
    const curator = this.user?.role === "curator";
    const row = siteRows().find((candidate) => candidate.id === id);

    if (!row || (!row.published && !curator)) return null;

    return this.toDTO(row);
  }

  /**
   * Sites within `radiusMeters` of a point, nearest first.
   *
   * This is what the report form calls before creating anything: if there is
   * already a site 30 m away, the answer is "confirm that one", not "create a
   * second pin for the same coliseum". PostGIS answered it with `<->`
   * against a GiST index; at this size a pass over the rows answers it just
   * as well.
   */
  async findNearby(
    longitude: number,
    latitude: number,
    radiusMeters = 50,
  ): Promise<{ id: string; name: string; type: string; distanceM: number }[]> {
    return siteRows()
      .filter((row) => row.published)
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        distanceM: Math.round(
          distanceMeters(longitude, latitude, row.longitude, row.latitude),
        ),
      }))
      .filter((row) => row.distanceM <= radiusMeters)
      .sort((a, b) => a.distanceM - b.distanceM);
  }

  /**
   * Reports a site. It is on the map immediately — for the person who
   * reported it, which in this demo is as far as anything travels.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async propose(input: unknown): Promise<SiteDTO> {
    const data = createSiteSchema.parse(input);

    if (!canProposeSite()) throw new Error("Forbidden");

    const now = new Date();

    // The barrio is derived from the point, never sent by the caller — the
    // `site_sets_neighborhood` trigger's rule, kept.
    const site = siteSchema.parse({
      id: crypto.randomUUID(),
      type: data.type,
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      longitude: data.longitude,
      latitude: data.latitude,
      neighborhood: resolveNeighborhood(data.longitude, data.latitude)?.name ?? null,
      status: "unknown",
      schedule: data.schedule ?? null,
      whatsapp: data.whatsapp ?? null,
      confirmedCount: 0,
      confirmedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + FRESH_HOURS * 3_600_000,
      ).toISOString(),
      items: [],
      published: true,
    });

    log.info("site proposed", { siteId: site.id, byUser: this.user?.id ?? "anon" });
    return site;
  }

  /** Makes a site visible to the city. Curators only. */
  async publish(id: string): Promise<Partial<SiteDTO>> {
    if (!canPublishSite(this.user)) throw new Error("Forbidden");

    log.info("site published", { siteId: id, byUser: this.user?.id });
    return { published: true, confirmedAt: new Date().toISOString() };
  }

  /**
   * Someone stood in front of the place and told us what they saw. Resets the
   * freshness clock, which is the mechanism that keeps this map from becoming
   * a list of places that closed last Tuesday.
   */
  async confirmStatus(input: unknown): Promise<Partial<SiteDTO>> {
    const { id, status } = updateSiteStatusSchema.parse(input);

    if (!canConfirmSite()) throw new Error("Forbidden");

    const now = new Date();

    log.info("site status confirmed", { siteId: id, status });
    return {
      status,
      confirmedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + FRESH_HOURS * 3_600_000).toISOString(),
    };
  }

  /** Corrects a site's own fields. Open to anyone — see `canEditSite`.
   *  Never the coordinate: that is `relocate` below. */
  async update(input: unknown): Promise<Partial<SiteDTO>> {
    const data = updateSiteSchema.parse(input);

    if (!canEditSite()) throw new Error("Forbidden");

    const patch: Partial<SiteDTO> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.address !== undefined) patch.address = data.address;
    if (data.schedule !== undefined) patch.schedule = data.schedule;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;

    log.info("site updated", {
      siteId: data.id,
      fields: Object.keys(patch),
      byUser: this.user?.id ?? "anon",
    });

    return patch;
  }

  /**
   * Moves a site's pin to a corrected coordinate.
   *
   * Anybody may do it inside the pin's own barrio; a curator may do it
   * anywhere in the covered area. See `canRelocate` for why the rule is that
   * shape rather than curator-only.
   *
   * The barrio is re-derived from the destination rather than carried over,
   * which is what the `site_sets_neighborhood` trigger did and for the same
   * reason: the name in the panel and the pin on the map cannot be allowed
   * to disagree.
   */
  async relocate(input: unknown): Promise<Partial<SiteDTO>> {
    const { id, longitude, latitude } = relocateSiteSchema.parse(input);

    const current = siteRows().find((row) => row.id === id);
    const currentBarrio = current
      ? (resolveNeighborhood(current.longitude, current.latitude)?.id ?? null)
      : // A pin created during this visit is not in the fixtures, so there is
        // no stored barrio to compare against. It was placed by the person
        // moving it, minutes ago, which is the case `canRelocate` is least
        // worried about.
        null;

    const target = resolveNeighborhood(longitude, latitude);

    if (!canRelocate(this.user, currentBarrio, target?.id ?? null)) {
      throw new Error(
        "Solo puedes mover el punto dentro de su propio barrio. Si está en el barrio equivocado, repórtalo.",
      );
    }

    log.info("site relocated", { siteId: id, byUser: this.user?.id ?? "anon" });
    return { longitude, latitude, neighborhood: target?.name ?? null };
  }

  /** A curator hides or republishes a site — reversible, the same
   *  `published` flag every list above filters by. */
  async setPublished(id: string, published: boolean): Promise<Partial<SiteDTO>> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    log.info("site visibility changed", {
      siteId: id,
      published,
      byUser: this.user!.id,
    });
    return { published };
  }

  /** Removing a site outright — curators only, for spam and test rows. */
  async remove(id: string): Promise<void> {
    if (!canManageSite(this.user)) throw new Error("Forbidden");

    log.info("site deleted", { siteId: id, byUser: this.user!.id });
  }

  /** Map explicitly, never spread. A field added to the fixture tomorrow
   *  stays server-side until someone deliberately adds it here and to the
   *  schema. */
  private toDTO(row: SiteRow): SiteDTO {
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
      confirmedCount: row.confirmedCount,
      confirmedAt: row.confirmedAt,
      expiresAt: row.expiresAt,
      items: row.items,
      published: row.published,
    });
  }
}
