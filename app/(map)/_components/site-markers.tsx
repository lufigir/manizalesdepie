"use client";

import {
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/components/ui/map";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  CONFIDENCE_MARKER,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  confidence,
} from "@/lib/labels";
import type { FanOffsets } from "@/lib/marker-fan";
import { cn } from "@/lib/utils";

import { SelectedMarkerLabel } from "./marker-label";

/**
 * Every pin on the map, each one on its own real coordinate.
 *
 * Pins are never pushed onto a ring when several overlap on screen, even
 * downtown where a dozen hospitals could collapse into one spot at city
 * zoom: the pin a reader tapped has to stay where the place is, and an
 * arrangement that re-shuffled on every zoom would mean the map moves under
 * the hand trying to read it. Overlap is the honest failure mode — zoom in
 * and they separate, because they really are separate.
 *
 * Except when they do not: an exact coordinate collision never separates, at
 * any zoom, and hides one pin under the other outright. `offsets` carries the
 * fixed nudge for those, and only for those — see `lib/marker-fan.ts`.
 */
export function SiteMarkers({
  sites,
  selectedId,
  onSelect,
  offsets,
}: {
  sites: SiteDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  offsets: FanOffsets;
}) {
  return (
    <>
      {sites.map((site) => (
        <SinglePin
          key={site.id}
          site={site}
          selected={selectedId === site.id}
          onSelect={onSelect}
          offset={offsets.get(site.id)}
        />
      ))}
    </>
  );
}

function SinglePin({
  site,
  selected,
  onSelect,
  offset,
}: {
  site: SiteDTO;
  selected: boolean;
  onSelect: (id: string) => void;
  offset?: [number, number];
}) {
  const Icon = SITE_TYPE_ICON[site.type];
  const { level, label: confidenceLabel } = confidence(site);

  return (
    <MapMarker
      longitude={site.longitude}
      latitude={site.latitude}
      offset={offset}
      onClick={() => onSelect(site.id)}
    >
      <MarkerContent>
        {/* The icon says what it is, the fill says whether it helps right
            now, and the solidity says how much anyone has vouched for it.
            Three facts, three channels, no legend needed to read the first
            one. */}
        <span className="relative block">
        <span
          className={cn(
            "ring-background flex size-7 items-center justify-center rounded-full shadow-md ring-2 transition-transform",
            SITE_STATUS_MARKER[site.status],
            CONFIDENCE_MARKER[level],
            selected && "scale-125",
          )}
          aria-label={`${SITE_TYPE_LABEL[site.type]}: ${site.name}. ${
            SITE_STATUS_LABEL[site.status]
          }. ${confidenceLabel}`}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        {selected && <SelectedMarkerLabel>{site.name}</SelectedMarkerLabel>}
        </span>
      </MarkerContent>
      {/* Names the pin before committing to a tap. Hover only, and only
          while this pin is not the selected one — `SelectedMarkerLabel`
          above already names that one, permanently. */}
      {!selected && <MarkerTooltip offset={20}>{site.name}</MarkerTooltip>}
    </MapMarker>
  );
}
