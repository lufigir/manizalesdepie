import { AnimalDAL } from "@/data/animal/animal.dal";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import { NeedDAL } from "@/data/need/need.dal";
import type { NeedDTO } from "@/data/need/need.dto";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { ServiceDAL } from "@/data/service/service.dal";
import type { ServiceDTO } from "@/data/service/service.dto";
import { SiteDAL } from "@/data/site/site.dal";
import type { SiteDTO } from "@/data/site/site.dto";

export type WorkspaceData = {
  sites: SiteDTO[];
  animals: AnimalDTO[];
  services: ServiceDTO[];
  needs: NeedDTO[];
  barrios: NeighborhoodDTO[];
};

/**
 * The five families `MapWorkspace` draws, loaded together.
 *
 * `UnifiedPanel` always renders all five chips with their counts, unconditionally
 * — there is no "this route only tracks three of them" mode. A route that
 * loads fewer than five and lets `MapWorkspace` fill the rest with `[]`
 * reports a real zero for a family it simply never asked for, which is the
 * worst possible answer to "¿dónde ayudo hoy?" for someone who followed a
 * WhatsApp link straight to one pin. Every one of the four shared-entity
 * routes (`/punto`, `/necesidad`, `/servicio`, `/mascota`) calls this instead
 * of repeating its own partial `Promise.all`.
 *
 * Public reads only: these routes serve an anonymous reader arriving from a
 * shared link, not a curator's session, so every DAL is opened with
 * `.public()` — same as each route already did for its own family before
 * this was extracted.
 */
export async function loadWorkspaceData(): Promise<WorkspaceData> {
  const [sites, animals, services, needs, barrios] = await Promise.all([
    SiteDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    ServiceDAL.public().listPublished(),
    NeedDAL.public().listPublished(),
    NeighborhoodDAL.public().list(),
  ]);

  return { sites, animals, services, needs, barrios };
}
