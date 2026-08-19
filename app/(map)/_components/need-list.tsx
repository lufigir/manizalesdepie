"use client";

import type { NeedDTO } from "@/data/need/need.dto";
import { NEED_LABEL } from "@/lib/labels";

import { EntityCard } from "./entity-card";

/**
 * Debris and damage in the panel — its own chip in `UnifiedPanel`, same
 * reasoning as a grupo: this is a thing with a lifecycle, not a place with
 * hours, so it does not belong inside the site list. The heading and count
 * live in the chip itself, not here.
 *
 * The row is `EntityCard`'s, like every other family's. It used to have one
 * of its own, which carried the full description, the freshness line, the
 * attendee count AND the whole of `NeedActions`:
 * the contact block, the attend form, the attendee list, close, edit. That
 * is a card, and the card is what a tap opens (`NeedPopup`). Two of
 * them, one stacked inside a list of thirty, was the panel's tallest row by
 * a wide margin and the same content twice.
 */
export function NeedList({
  needs,
  selectedId,
  onSelect,
}: {
  needs: NeedDTO[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (needs.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {NEED_LABEL.empty}
      </p>
    );
  }

  return (
    <div className="p-1.5">
      <ul className="flex flex-col gap-1.5">
        {needs.map((order) => (
          <li key={order.id}>
            <EntityCard
              entity={{ kind: "need", order }}
              selected={order.id === selectedId}
              onSelect={(id) => onSelect?.(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
