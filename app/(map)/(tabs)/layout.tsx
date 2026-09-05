import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { NeedDAL } from "@/data/need/need.dal";
import { ServiceDAL } from "@/data/service/service.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/current-user";

import { MapWorkspace } from "../_components/map-workspace";

/**
 * Everything the map needs: loaded once, here, and handed down to
 * `MapWorkspace` (which renders the filter row and the panel beside it — see
 * `UnifiedPanel`).
 *
 * `(tabs)/page.tsx` — the bare `/` — is the only route under this layout:
 * every `UnifiedPanel` chip is reachable in one tap from `/`, so no family
 * needs a route of its own.
 *
 * A Server Component: it reads through the DALs and hands plain data down.
 * Loaded once here rather than per family, because every filter now shows
 * counts for every other one.
 */
export default async function TabsLayout() {
  const [sites, animals, services, needs, barrios, user] = await Promise.all([
    // `.create()`, not `.public()`, on every list read below: a curator's
    // session has to reach each DAL for `listPublished` to include what
    // they hid (see the note on `NeedDAL.listPublished`) — otherwise
    // `setPublished(id, false)` would have no way back except a direct
    // database query. `getCurrentUser` is request-cached, so this costs
    // nothing extra over the `isAdmin` read below.
    SiteDAL.create().then((dal) => dal.listPublished()),
    AnimalDAL.create().then((dal) => dal.listPublished()),
    ServiceDAL.create().then((dal) => dal.listPublished()),
    NeedDAL.create().then((dal) => dal.listPublished()),
    // The barrio list, for the picker inside the relocation overlay: aiming a
    // corrected pin by naming the barrio is the same easy version of the
    // question the report form already leans on (see `BarrioPicker`).
    NeighborhoodDAL.public().list(),
    getCurrentUser(),
  ]);

  return (
    <main className="h-full w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        animals={animals}
        services={services}
        needs={needs}
        barrios={barrios}
        user={user}
      />
    </main>
  );
}
