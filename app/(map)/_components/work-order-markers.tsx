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

import { useClusters } from "./use-clusters";

/**
 * Necesidades on the map — the one family that used to exist only as a list
 * row, with nothing drawn for it at all.
 *
 * A diamond, not a circle or a square: a site is a place you can walk into
 * and a grupo is a pin with a corner, so a case — neither of those — gets
 * its own outline. Read at a glance before the icon or the colour has been
 * decoded, the same way the other two shapes already are.
 *
 * Clustered like sites: several requests from the same block are exactly
 * the density this map already has a pattern for.
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
  const clusters = useClusters(workOrders);

  return (
    <>
      {clusters.map((cluster) =>
        cluster.items.length === 1 ? (
          <SinglePin
            key={cluster.key}
            order={cluster.items[0]}
            selected={selectedId === cluster.items[0].id}
            onSelect={onSelect}
          />
        ) : (
          <MapMarker key={cluster.key} longitude={cluster.longitude} latitude={cluster.latitude}>
            <MarkerContent>
              <span
                className="ring-background bg-background text-foreground flex size-8 rotate-45 items-center justify-center rounded-md shadow-md ring-2"
                aria-label={`${cluster.items.length} necesidades reportadas aquí.`}
              >
                <span className="-rotate-45 text-xs font-bold tabular-nums">
                  {cluster.items.length}
                </span>
              </span>
            </MarkerContent>
            <MarkerTooltip offset={20}>
              {cluster.items
                .slice(0, 4)
                .map((o) => WORK_ORDER_CATEGORY_LABEL[o.category])
                .join(" · ")}
              {cluster.items.length > 4 && ` y ${cluster.items.length - 4} más`}
            </MarkerTooltip>
          </MapMarker>
        ),
      )}
    </>
  );
}

function SinglePin({
  order,
  selected,
  onSelect,
}: {
  order: WorkOrderDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const rollup = workOrderRollup(order.status);

  return (
    <MapMarker
      longitude={order.longitude}
      latitude={order.latitude}
      onClick={() => onSelect(order.id)}
    >
      <MarkerContent>
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
