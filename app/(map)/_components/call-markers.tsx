"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { CallDTO } from "@/data/call/call.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CONFIDENCE_MARKER,
  callState,
  callWhen,
  confidence,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Jornadas on the map, drawn alongside the acopios in "Ayudar".
 *
 * Not clustered, unlike sites. Clustering exists because downtown Manizales
 * stacks a dozen places inside a few blocks; shifts are convened by the handful
 * and spread across the city, so grouping them would hide the pin that is the
 * whole answer without solving a problem anyone has. If that stops being true,
 * `useClusters` is generic enough to take them.
 *
 * The square badge is deliberate: at a glance a jornada must not be mistaken
 * for a place you can walk into. A pin with a corner is a different kind of
 * thing, before the icon or the colour has been read.
 */
export function CallMarkers({
  calls,
  selectedId,
  onSelect,
}: {
  calls: CallDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {calls.map((call) => {
        const Icon = CALL_CATEGORY_ICON[call.category];
        const state = callState(call);
        const { level, label: confidenceLabel } = confidence(call);

        return (
          <MapMarker
            key={call.id}
            longitude={call.longitude}
            latitude={call.latitude}
            onClick={() => onSelect(call.id)}
          >
            <MarkerContent>
              <span
                className={cn(
                  "ring-background flex size-7 items-center justify-center rounded-md shadow-md ring-2 transition-transform",
                  CALL_STATE_MARKER[state],
                  CONFIDENCE_MARKER[level],
                  selectedId === call.id && "scale-125",
                )}
                aria-label={`Jornada de ${CALL_CATEGORY_LABEL[call.category]}: ${
                  call.title
                }. ${CALL_STATE_LABEL[state]}. ${confidenceLabel}`}
              >
                <Icon className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
            </MarkerContent>
            {/* The hour rides in the tooltip. For a shift it is half the
                identity, and it saves a tap for the reader deciding between
                two of them. */}
            <MarkerTooltip offset={20}>
              {call.title} · {callWhen(call)}
            </MarkerTooltip>
          </MapMarker>
        );
      })}
    </>
  );
}
