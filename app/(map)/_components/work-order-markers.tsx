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

import { SelectedMarkerLabel } from "./marker-label";

/**
 * Necesidades on the map — now the only family with a shape of its own worth
 * learning, and the spine of the product.
 *
 * A diamond, not a circle or a square: a site is a place you can walk into,
 * so a case — which is a job, not a destination — gets its own outline. Read
 * at a glance before the icon or the colour has been decoded.
 *
 * Every pin sits on its own real coordinate. Cases used to be pushed onto a
 * ring around a shared centroid whenever several overlapped on screen
 * (`useSpreadPins`), which meant the pin a reader tapped was not where the
 * case is — it moved as they zoomed, and two cases a block apart could be
 * drawn further from each other than from where they actually are. On a map
 * whose whole premise is "¿por dónde queda exactamente?", a coordinate that
 * shifts with the viewport is the one thing that must not happen. Overlap is
 * the honest failure mode: zooming in separates them, because they are
 * genuinely separate.
 *
 * The count badge is what the ring was really for — knowing there is more
 * than one thing here — and it says it without moving anything.
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
  return (
    <>
      {workOrders.map((order) => (
        <SinglePin
          key={order.id}
          order={order}
          selected={selectedId === order.id}
          onSelect={onSelect}
        />
      ))}
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
  const rollup = workOrderRollup(order);

  // Everybody who has stood in front of this case and said something. The
  // colour already carries WHAT was said (see `workOrderRollup`); this
  // carries how much of it there is, which is the difference between a case
  // one neighbour mentioned and one the whole block is working on.
  const entryCount = order.attendeeCount + order.helpedCount;

  return (
    <MapMarker
      longitude={order.longitude}
      latitude={order.latitude}
      onClick={() => onSelect(order.id)}
    >
      <MarkerContent>
        <span className="relative block">
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

          {/* Outside the rotated square so it is not itself rotated, and
              unrotated rather than counter-rotated so the digits sit level
              with the horizon at every zoom. Hidden at zero: an empty badge
              on most pins would be noise on the state that is already the
              map's loudest. */}
          {entryCount > 0 && (
            <span
              className="bg-background text-foreground absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full border px-1 text-[0.6rem] leading-tight font-bold tabular-nums shadow-sm"
              aria-hidden
            >
              {entryCount}
            </span>
          )}

          {selected && (
            <SelectedMarkerLabel>
              {WORK_ORDER_CATEGORY_LABEL[order.category]}
              {order.neighborhood && ` · ${order.neighborhood}`}
            </SelectedMarkerLabel>
          )}
        </span>
      </MarkerContent>
      {/* Hover only, and only while nothing is selected here — the label
          above already says it, and both at once would stack two identical
          pills over one pin. */}
      {!selected && (
        <MarkerTooltip offset={20}>
          {WORK_ORDER_CATEGORY_LABEL[order.category]}
          {order.neighborhood && ` · ${order.neighborhood}`}
        </MarkerTooltip>
      )}
    </MapMarker>
  );
}
