import { AnimalDAL } from "@/data/animal/animal.dal";
import { CallDAL } from "@/data/call/call.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ResourceOfferDAL } from "@/data/resource_offer/resource_offer.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";

import { MapWorkspace } from "../_components/map-workspace";

/**
 * Everything every section shares: one unified map, the filter row above it,
 * and the panel beside it (see `MapWorkspace`, `UnifiedPanel`).
 *
 * The four child routes (`ayudar/`, `necesito/`, …) still exist and each
 * renders nothing of its own — they only carry metadata and seed which filter
 * opens, so `/mascotas` stays a real, shareable URL without gating what the
 * map draws the way it used to.
 *
 * A Server Component: it reads through the DALs and hands plain data down.
 * Loaded once here rather than per section, because every filter now shows
 * counts for every other one.
 */
export default async function TabsLayout() {
  const [
    sites,
    calls,
    animals,
    resourceOffers,
    workOrders,
    neighborhoodStatuses,
    neighborhoodNeeds,
  ] = await Promise.all([
    SiteDAL.public().listPublished(),
    CallDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    ResourceOfferDAL.public().listPublished(),
    WorkOrderDAL.public().listPublished(),
    NeighborhoodDAL.public().statuses(),
    NeighborhoodDAL.public().needs(),
  ]);

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        calls={calls}
        animals={animals}
        resourceOffers={resourceOffers}
        workOrders={workOrders}
        neighborhoodStatuses={neighborhoodStatuses}
        neighborhoodNeeds={neighborhoodNeeds}
      />
    </main>
  );
}
