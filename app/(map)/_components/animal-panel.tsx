"use client";

import { AnimalBoard } from "./animal-board";
import { useWorkspace } from "./workspace-context";

/** The photo board, wired to the same selection the sighting markers use. */
export function AnimalPanel() {
  const { animals, selectedId, select } = useWorkspace();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <AnimalBoard animals={animals} selectedId={selectedId} onSelect={select} />
    </div>
  );
}
