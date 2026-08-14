"use client";

import { PANEL_LABEL } from "@/lib/labels";

import { AnimalBoard } from "./animal-board";
import { BalanceTab } from "./balance-tab";
import { PanelTabs, type PanelTabDef } from "./panel-tabs";
import { useWorkspace } from "./workspace-context";

/** The photo board, wired to the same selection the sighting markers use,
 *  alongside Balance — the two tabs every section carries. */
export function AnimalPanel() {
  const { animals, selectedId, select } = useWorkspace();

  const tabs: PanelTabDef[] = [
    { id: "balance", label: PANEL_LABEL.balance, content: <BalanceTab /> },
    {
      id: "animals",
      label: PANEL_LABEL.pets,
      // Only the ones still missing count here: a reunited pet is good news,
      // not an open case, same rule the section's own count already follows.
      count: animals.filter((animal) => animal.resolvedAt === null).length,
      matches: (id) => animals.some((animal) => animal.id === id),
      // AnimalBoard's grid carries no scroll of its own — it used to rely on
      // the aside itself scrolling as a whole. Each tab now owns its own
      // scroll region instead, same as every other tab's content.
      content: (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimalBoard animals={animals} selectedId={selectedId} onSelect={select} />
        </div>
      ),
    },
  ];

  return <PanelTabs tabs={tabs} />;
}
