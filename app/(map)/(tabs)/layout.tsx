import { AnimalDAL } from "@/data/animal/animal.dal";
import { CallDAL } from "@/data/call/call.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ResourceOfferDAL } from "@/data/resource_offer/resource_offer.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { SituationDAL } from "@/data/situation/situation.dal";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";

import { MapWorkspace } from "../_components/map-workspace";

/**
 * Everything the four sections share: the map, the switcher, the balance.
 *
 * It is a layout rather than four pages because the map has to survive moving
 * between sections — MapLibre remounted on every tap loses the camera, refetches
 * tiles and blinks, and on a phone with one bar of signal that is the whole
 * experience. Each section's page renders only its own panel.
 *
 * A Server Component: it reads through the DALs and hands plain data down. All
 * three reads are small and every section shows the counts of the others, so
 * they are loaded once here instead of per section.
 */
export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    sites,
    calls,
    animals,
    resourceOffers,
    workOrders,
    report,
    neighborhoodStatuses,
  ] = await Promise.all([
    SiteDAL.public().listPublished(),
    CallDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    ResourceOfferDAL.public().listPublished(),
    // .create(), not .public(): `claimedByMe` needs to know who is asking,
    // and it is the one field here that differs between an anonymous
    // visitor and the person who already holds the claim.
    WorkOrderDAL.create().then((dal) => dal.listPublished()),
    SituationDAL.public().latest(),
    NeighborhoodDAL.public().statuses(),
  ]);

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        calls={calls}
        animals={animals}
        resourceOffers={resourceOffers}
        workOrders={workOrders}
        report={report}
        neighborhoodStatuses={neighborhoodStatuses}
      >
        {children}
      </MapWorkspace>
    </main>
  );
}
