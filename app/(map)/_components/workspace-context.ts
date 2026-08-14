"use client";

import { createContext, useContext } from "react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type { NeighborhoodStatusDTO } from "@/data/neighborhood/neighborhood.dto";
import type { SiteDTO } from "@/data/site/site.dto";
import type { TabId } from "@/lib/tabs";

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
  tab: TabId;
  /** Sites belonging to the active tab, already carrying live status. */
  sites: SiteDTO[];
  /** Jornadas, narrowed to the barrio like `sites`. Empty outside "Ayudar":
   *  a shift is a way of helping, so it appears in exactly one section. */
  calls: CallDTO[];
  /** Every animal report. Unlike sites these are not filtered by tab: they
   *  only ever appear in one. */
  animals: AnimalDTO[];
  selectedId: string | null;
  select: (id: string | null) => void;
  /** The barrio being filtered by, or null for the whole city. `sites` is
   *  already narrowed to it; this is here so a panel can say which one. */
  barrio: { name: string; comuna: string | null } | null;
  clearBarrio: () => void;
  /** The selected barrio's evacuation/utility status, or null when it has none
   *  on record — most barrios, most of the time. */
  barrioStatus: NeighborhoodStatusDTO | null;
};

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace debe usarse dentro de MapWorkspace");
  }
  return value;
}
