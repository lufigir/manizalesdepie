"use client";

import { useMemo } from "react";

import { SERVICES_LABEL } from "@/lib/labels";
import { resourceOfferUrgency } from "@/lib/urgency";

import { EntityCard } from "./entity-card";
import { useWorkspace } from "./workspace-context";

/**
 * Servicios in the panel — same index row as necesidades. The browsing grid
 * with inline edit lived here once; selecting a row now opens
 * `ResourceOfferPopup` on the map edge, where the detail and contact live.
 */
export function ServicesPanel() {
  const { resourceOffers, selectedId, select } = useWorkspace();

  const sorted = useMemo(
    () =>
      [...resourceOffers].sort(
        (a, b) => resourceOfferUrgency(b) - resourceOfferUrgency(a),
      ),
    [resourceOffers],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {SERVICES_LABEL.empty}
      </p>
    );
  }

  return (
    <div className="p-1.5">
      <ul className="flex flex-col gap-1.5">
        {sorted.map((offer) => (
          <li key={offer.id}>
            <EntityCard
              entity={{ kind: "resourceOffer", offer }}
              selected={offer.id === selectedId}
              onSelect={select}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
