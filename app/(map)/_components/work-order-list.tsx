"use client";

import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import {
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  WORK_ORDER_ROLLUP_MARKER,
  WORK_ORDER_ROLLUP_STYLE,
  freshness,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { WorkOrderActions } from "./work-order-actions";

/**
 * Debris and damage, in "Ayudar" — its own chip in `UnifiedPanel`, same
 * reasoning as a grupo: this is a thing with a lifecycle, not a place with
 * hours, so it does not belong inside the site list. The heading and count
 * live in the chip itself, not here — this renders once that chip is active,
 * or as one row among others inside "Todo".
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
            <WorkOrderItem
              order={order}
              selected={order.id === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One case as a list row — exported so the "Todo" merged list (see
 * `entity-list.tsx`) can place it among grupos and sitios.
 *
 * The map's version of this is `WorkOrderPopup`, not this component: a
 * popup and a list row answer differently shaped questions, and the two
 * share `WorkOrderActions` rather than one pretending to be the other.
 *
 * `onSelect` is optional and separate from every action on the card on
 * purpose: tapping the header/description flies the map to it and opens its
 * popup, same as any other row — see `EntityCard`. None of the actions
 * below may ever also trigger that, which is why the clickable area is its
 * own `<button>` around only the identifying part of the card.
 */
export function WorkOrderItem({
  order,
  selected = false,
  onSelect,
}: {
  order: WorkOrderDTO;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const rollup = workOrderRollup(order.status);
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const { label: freshLabel } = freshness(order.confirmedAt);

  return (
    <div
      className={cn(
        "rounded-lg border p-2 transition-colors",
        // The whole card is one hover target, not just the header button
        // sitting inside it — a highlight that only covers the top third of
        // a card this tall reads as broken, not as an affordance.
        selected ? "border-primary bg-accent" : "hover:bg-accent",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(order.id)}
        aria-current={selected}
        disabled={!onSelect}
        className="focus-visible:ring-ring w-full rounded-md text-left disabled:cursor-default focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              WORK_ORDER_ROLLUP_MARKER[rollup],
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
            {WORK_ORDER_CATEGORY_LABEL[order.category]}
            {order.neighborhood && ` · ${order.neighborhood}`}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
              WORK_ORDER_ROLLUP_STYLE[rollup],
            )}
          >
            {WORK_ORDER_ROLLUP_LABEL[rollup]}
          </span>
        </div>

        <p className="mt-1 text-xs leading-snug">{order.description}</p>

        <p className="text-muted-foreground mt-0.5 text-[0.65rem]">
          {freshLabel} ·{" "}
          {order.attendeeCount === 0
            ? WORK_ORDER_LABEL.attendeeCountNone
            : order.attendeeCount === 1
              ? WORK_ORDER_LABEL.attendeeCountOne
              : WORK_ORDER_LABEL.attendeeCountMany(order.attendeeCount)}
        </p>
      </button>

      <WorkOrderActions order={order} />
    </div>
  );
}
