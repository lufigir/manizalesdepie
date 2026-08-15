"use client";

import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import { WORK_ORDER_LABEL } from "@/lib/labels";

import { EntityCard } from "./entity-card";

/**
 * Debris and damage in the panel — its own chip in `UnifiedPanel`, same
 * reasoning as a grupo: this is a thing with a lifecycle, not a place with
 * hours, so it does not belong inside the site list. The heading and count
 * live in the chip itself, not here.
 *
 * The row is `EntityCard`'s, like every other family's. It used to have one
 * of its own — `WorkOrderItem`, which carried the full description, the
 * freshness line, the attendee count AND the whole of `WorkOrderActions`:
 * the contact block, the attend form, the attendee list, close, edit. That
 * is a card, and the card is what a tap opens (`WorkOrderPopup`). Two of
 * them, one stacked inside a list of thirty, was the panel's tallest row by
 * a wide margin and the same content twice.
 */
export function WorkOrderList({
  workOrders,
  selectedId,
  onSelect,
}: {
  workOrders: WorkOrderDTO[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (workOrders.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {WORK_ORDER_LABEL.empty}
      </p>
    );
  }

  return (
    <div className="p-1.5">
      <ul className="flex flex-col gap-1.5">
        {workOrders.map((order) => (
          <li key={order.id}>
            <EntityCard
              entity={{ kind: "workOrder", order }}
              selected={order.id === selectedId}
              onSelect={(id) => onSelect?.(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
