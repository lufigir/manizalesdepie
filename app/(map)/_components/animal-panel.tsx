"use client";

import { useMemo } from "react";

import { ANIMAL_LABEL } from "@/lib/labels";
import { animalUrgency } from "@/lib/urgency";

import { EntityCard } from "./entity-card";
import { useWorkspace } from "./workspace-context";

/**
 * Mascotas in the panel — same index row as necesidades. The photo board with
 * inline actions lived here once; selecting a row now opens `AnimalPopup` on
 * the map edge, where the detail and contact live.
 */
export function AnimalPanel() {
  const { animals, selectedId, select } = useWorkspace();

  const sorted = useMemo(
    () => [...animals].sort((a, b) => animalUrgency(b) - animalUrgency(a)),
    [animals],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {ANIMAL_LABEL.empty}
      </p>
    );
  }

  return (
    <div className="p-1.5">
      <ul className="flex flex-col gap-1.5">
        {sorted.map((animal) => (
          <li key={animal.id}>
            <EntityCard
              entity={{ kind: "animal", animal }}
              selected={animal.id === selectedId}
              onSelect={select}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
