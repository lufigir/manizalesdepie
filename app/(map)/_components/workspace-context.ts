"use client";

import { createContext, useContext } from "react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { NeedDTO } from "@/data/need/need.dto";
import type { ServiceDTO } from "@/data/service/service.dto";
import type { SiteDTO } from "@/data/site/site.dto";
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
  /** `UnifiedPanel`'s own chip — Todo, Necesidades, Sitios, Mascotas or
   *  Servicios, always shown together now (see `lib/tabs.ts`). Client
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
  /** Every animal report, unfiltered — the board (and "Todo") decide for
   *  themselves which to show. Most carry no coordinate at all, so barrio
   *  narrowing does not apply to them the way it does to everything else
   *  here. */
  animals: AnimalDTO[];
  /** Every service, narrowed to the barrio like `sites` — a service does
   *  carry a `neighborhood`, even though it is a barrio-level fact (the
   *  form's own centroid) rather than an exact point. */
  services: ServiceDTO[];
  /** Individual household requests — "Necesidades" — narrowed to the barrio
   *  like `sites`. */
  needs: NeedDTO[];
  selectedId: string | null;
  select: (id: string | null) => void;
  /** The barrio being filtered by, or null for the whole city. `sites` is
   *  already narrowed to it; this is here so a panel can say which one. */
  barrio: { name: string; comuna: string | null } | null;
  clearBarrio: () => void;
  /** Filters the panel to a barrio by name alone — what a filtered chip uses
   *  to narrow without the full `BarrioProps` a map tap produces (comuna,
   *  the label's own coordinate). `comuna` reads null until the reader taps
   *  the barrio on the map instead; BarrioHeader already treats a missing
   *  comuna as "don't show that line". */
  selectBarrioByName: (name: string) => void;
  /** Whether the panel is shrunk to just its tab bar, on mobile, to give the
   *  map more room. Carried in the workspace (not local to PanelTabs) so it
   *  survives moving between sections during the same visit. */
  panelCollapsed: boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
  /** A curator, signed in. Every card's edit/hide/delete strip (see
   *  `AdminActions`) checks this instead of fetching its own session — one
   *  server read in the tab layout, not one per card. */
  isAdmin: boolean;
  /** The signed-in reader's name, or null. Every form in the app that asks
   *  "¿quién eres?" seeds its field from this: somebody who already told us
   *  their name once should not be typing it again on a phone, standing in
   *  the street. It stays an editable field — a neighbour reporting on
   *  somebody else's behalf has to be able to put the other name in. */
  userName: string | null;
  /**
   * Puts the map into "corrige este pin" mode.
   *
   * Lives on the workspace rather than inside each card because the control
   * that starts it (a button on a card) and the surface that finishes it (the
   * map, with a crosshair over it) are in different trees. Null `kind` is not
   * offered: only sitios and necesidades have an exact point to correct.
   */
  startRelocate: (target: {
    id: string;
    kind: "site" | "need";
    longitude: number;
    latitude: number;
  }) => void;
};

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace debe usarse dentro de MapWorkspace");
  }
  return value;
}
