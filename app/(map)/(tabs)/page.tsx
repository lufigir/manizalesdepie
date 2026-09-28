import type { Metadata } from "next";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeedDAL } from "@/data/need/need.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ServiceDAL } from "@/data/service/service.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { parseBarrioParam } from "@/lib/workspace-search-params";

import { MapWorkspace } from "../_components/map-workspace";

export const metadata: Metadata = {
  title: "¿Dónde ayudo hoy?",
  description:
    "Mapa vivo de la ayuda en Manizales y Villamaría: necesidades, acopios, albergues y donación de sangre.",
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * The map itself, at `/` — the only route under `(tabs)`.
 *
 * `(tabs)` is a route group, so it adds no segment — this file IS the root.
 * It used to hand this job to a sibling `layout.tsx`, but a `searchParams`
 * prop is only ever handed to a `page`, never to a `layout` (a shared layout
 * is not re-rendered on navigation, so Next refuses to risk a stale query
 * string leaking into one — see the `useSearchParams` and `layout` API
 * docs). The barrio filter has to read that query string on the server to
 * seed `MapWorkspace` without a client-side flash, so the loading this page
 * needs sits here now, not one level up.
 *
 * Everything the map needs is loaded once, here, and handed down to
 * `MapWorkspace` (which renders the filter row and the panel beside it — see
 * `UnifiedPanel`). Every `UnifiedPanel` chip is reachable in one tap from
 * `/`, so no family needs a route of its own; `MapWorkspace` seeds
 * `DEFAULT_TAB_ID` ("help") whenever no `tab` is forced, which opens on the
 * "Todo" chip — the right thing to show at the bare domain.
 */
export default async function MapPage({ searchParams }: Props) {
  const [sites, animals, services, needs, barrios, user, rawSearchParams] =
    await Promise.all([
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
      // The barrio list, for the picker inside the relocation overlay, and
      // for validating the `?barrio=` query string below: aiming a
      // corrected pin by naming the barrio is the same easy version of the
      // question the report form already leans on (see `BarrioPicker`).
      NeighborhoodDAL.public().list(),
      getCurrentUser(),
      searchParams,
    ]);

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        animals={animals}
        services={services}
        needs={needs}
        barrios={barrios}
        user={user}
        initialBarrioName={parseBarrioParam(rawSearchParams)}
      />
    </main>
  );
}
