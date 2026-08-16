import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ResourceOfferDAL } from "@/data/resource_offer/resource_offer.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";

import { MapWorkspace } from "../_components/map-workspace";

/**
 * Everything the map needs: loaded once, here, and handed down to
 * `MapWorkspace` (which renders the filter row and the panel beside it — see
 * `UnifiedPanel`).
 *
 * `(tabs)/page.tsx` — the bare `/` — is the only route left under this
 * layout. `/necesito`, `/mascotas` and `/servicios` used to sit beside it,
 * each rendering nothing of its own and existing only to seed one
 * `UnifiedPanel` chip; they were removed once every chip became reachable in
 * one tap from `/` anyway, the same reasoning `/ayudar` was dropped under.
 *
 * A Server Component: it reads through the DALs and hands plain data down.
 * Loaded once here rather than per family, because every filter now shows
 * counts for every other one.
 */
export default async function TabsLayout() {
  const [
    sites,
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
