"use client";

import { createContext, useContext } from "react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type {
  NeighborhoodNeedDTO,
  NeighborhoodStatusDTO,
} from "@/data/neighborhood/neighborhood.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { SiteDTO } from "@/data/site/site.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import type { PanelChip } from "@/lib/tabs";

/**
 * What the map and the panel beside it share.
 *
 * The map lives in the tab layout so it survives moving between sections — a
 * MapLibre canvas that remounts on every tap throws away the camera and blinks.
 * The panel lives in each section's page, because a photo board and a list of
 * places are genuinely different screens.
 *
 * Selection has to be shared by both halves (tapping a pin scrolls the list,
 * tapping the list flies the map), and a layout cannot pass props to its
 * children. Hence a context: one owner, the workspace, and every panel reads it.
 */
export type WorkspaceValue = {
  /** `UnifiedPanel`'s own chip — Todo, Grupos, Necesidades, Sitios, Mascotas
   *  or Servicios, always shown together now (see `lib/tabs.ts`). Client
   *  state, not the route: the map draws every family at once regardless of
   *  which chip is open. Seeded from the route segment on first render (see
   *  `MapWorkspace`), free to change after. */
  activeChip: PanelChip;
  setActiveChip: (chip: PanelChip) => void;
  /** Every site — both what a barrio can give and what it needs — already
   *  carrying live status, narrowed to the barrio filter. The map draws
   *  every one regardless of the active chip; this list is what the panel
   *  narrows further. */
  sites: SiteDTO[];
  /** Grupos, narrowed to the barrio like `sites`. */
  calls: CallDTO[];
  /** Every animal report, unfiltered — the board (and "Todo") decide for
   *  themselves which to show. Most carry no coordinate at all, so barrio
   *  narrowing does not apply to them the way it does to everything else
   *  here. */
  animals: AnimalDTO[];
  /** Every resource offer, narrowed to the barrio like `sites` — offers do
   *  carry a `neighborhood`, even though it is a barrio-level fact (the
   *  form's own centroid) rather than an exact point. */
  resourceOffers: ResourceOfferDTO[];
  /** Individual household requests — "Necesidades" — narrowed to the barrio
   *  like `sites`. */
  workOrders: WorkOrderDTO[];
  /** `calls` and `workOrders`, but city-wide — never narrowed to the barrio
   *  filter. `FrontsList` counts every grupo and every case in a barrio
   *  whether or not that barrio happens to be the one currently selected, so
   *  it reads from these instead of the narrowed lists above. */
  cityCalls: CallDTO[];
  cityWorkOrders: WorkOrderDTO[];
  /** Every frente on record — "este barrio necesita X". Read by
   *  `lib/urgency.ts`'s priority weighting and by `FrontsList`, which has no
   *  chip of its own yet (see `PanelChip` in `lib/tabs.ts`) but still exists
   *  for when the curator team starts declaring frentes. City-wide, like
   *  `neighborhoodStatuses`. */
  neighborhoodNeeds: NeighborhoodNeedDTO[];
  selectedId: string | null;
  select: (id: string | null) => void;
  /** The barrio being filtered by, or null for the whole city. `sites` is
   *  already narrowed to it; this is here so a panel can say which one. */
  barrio: { name: string; comuna: string | null } | null;
  clearBarrio: () => void;
  /** Filters the panel to a barrio by name alone — what a Frentes row uses to
   *  filter without the full `BarrioProps` a map tap produces (comuna, the
   *  label's own coordinate). `comuna` reads null until the reader taps the
   *  barrio on the map instead; BarrioHeader already treats a missing comuna
   *  as "don't show that line". */
  selectBarrioByName: (name: string) => void;
  /** The selected barrio's evacuation/utility status, or null when it has none
   *  on record — most barrios, most of the time. */
  barrioStatus: NeighborhoodStatusDTO | null;
  /** Every barrio with a status on record, city-wide reference read the same
   *  everywhere it appears. */
  neighborhoodStatuses: NeighborhoodStatusDTO[];
  /** Whether the panel is shrunk to just its tab bar, on mobile, to give the
   *  map more room. Carried in the workspace (not local to PanelTabs) so it
   *  survives moving between sections during the same visit. */
  panelCollapsed: boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
  /** A curator, signed in. Every card's edit/hide/delete strip (see
   *  `AdminActions`) checks this instead of fetching its own session — one
   *  server read in the tab layout, not one per card. */
  isAdmin: boolean;
};

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace debe usarse dentro de MapWorkspace");
  }
  return value;
}
