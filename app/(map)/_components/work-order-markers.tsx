"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import {
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  WORK_ORDER_ROLLUP_MARKER,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useSpreadPins } from "./use-clusters";

/**
 * Necesidades on the map — the one family that used to exist only as a list
 * row, with nothing drawn for it at all.
 *
 * A diamond, not a circle or a square: a site is a place you can walk into
 * and a grupo is a pin with a corner, so a case — neither of those — gets
 * its own outline. Read at a glance before the icon or the colour has been
 * decoded, the same way the other two shapes already are.
 *
 * Spread apart like sites: several requests from the same block are exactly
 * the density `useSpreadPins` exists for, and a case's own category icon is
 * worth more at a glance than a count would be.
 */
export function WorkOrderMarkers({
  workOrders,
  selectedId,
  onSelect,
}: {
  workOrders: WorkOrderDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pins = useSpreadPins(workOrders);

  return (
    <>
      {pins.map(({ item, longitude, latitude, offsetX, offsetY }) => (
        <SinglePin
          key={item.id}
          order={item}
          longitude={longitude}
          latitude={latitude}
          offsetX={offsetX}
          offsetY={offsetY}
          selected={selectedId === item.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function SinglePin({
  order,
  longitude,
  latitude,
  offsetX,
  offsetY,
  selected,
  onSelect,
}: {
  order: WorkOrderDTO;
  longitude: number;
  latitude: number;
  offsetX: number;
  offsetY: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const rollup = workOrderRollup(order.status);
  const spread = offsetX !== 0 || offsetY !== 0;

  return (
    <MapMarker
      longitude={longitude}
      latitude={latitude}
      onClick={() => onSelect(order.id)}
    >
      <MarkerContent>
        <span
          className="block transition-transform duration-200"
          style={spread ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : undefined}
        >
          <span
            className={cn(
              "ring-background flex size-7 rotate-45 items-center justify-center rounded-md shadow-md ring-2 transition-transform",
              WORK_ORDER_ROLLUP_MARKER[rollup],
              selected && "scale-125",
            )}
            aria-label={`Necesidad de ${WORK_ORDER_CATEGORY_LABEL[order.category]}: ${
              order.description
            }. ${WORK_ORDER_ROLLUP_LABEL[rollup]}.`}
          >
            <Icon className="-rotate-45 size-4" strokeWidth={2.5} aria-hidden />
          </span>
        </span>
      </MarkerContent>
      {!selected && (
        <MarkerTooltip offset={20}>
          {WORK_ORDER_CATEGORY_LABEL[order.category]}
          {order.neighborhood && ` · ${order.neighborhood}`}
        </MarkerTooltip>
      )}
    </MapMarker>
  );
}
