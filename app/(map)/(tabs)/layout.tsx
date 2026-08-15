import { AnimalDAL } from "@/data/animal/animal.dal";
import { CallDAL } from "@/data/call/call.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ResourceOfferDAL } from "@/data/resource_offer/resource_offer.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
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
    user,
  ] = await Promise.all([
    // `.create()`, not `.public()`, on every list read below: a curator's
    // session has to reach each DAL for `listPublished` to include what
    // they hid (see the note on `WorkOrderDAL.listPublished`) — otherwise
    // `setPublished(id, false)` would have no way back except a direct
    // database query. `getCurrentUser` is request-cached, so this costs
    // nothing extra over the `isAdmin` read below.
    SiteDAL.create().then((dal) => dal.listPublished()),
    CallDAL.create().then((dal) => dal.listPublished()),
    AnimalDAL.create().then((dal) => dal.listPublished()),
    ResourceOfferDAL.create().then((dal) => dal.listPublished()),
    WorkOrderDAL.create().then((dal) => dal.listPublished()),
    NeighborhoodDAL.public().statuses(),
    NeighborhoodDAL.public().needs(),
    getCurrentUser(),
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
        isAdmin={user?.role === "curator"}
      />
    </main>
  );
}
