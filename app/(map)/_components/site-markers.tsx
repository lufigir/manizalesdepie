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
import { cn } from "@/lib/utils";

import { SelectedMarkerLabel } from "./marker-label";

/**
 * Every pin on the map, each one on its own real coordinate.
 *
 * Pins used to be pushed onto a ring whenever several overlapped on screen,
 * to keep downtown's dozen hospitals from collapsing into one spot at city
 * zoom. It cost more than it bought: the pin a reader tapped was no longer
 * where the place is, and the whole arrangement re-shuffled on every zoom, so
 * the map moved under the hand that was trying to read it. Overlap is the
 * honest failure mode — zoom in and they separate, because they really are
 * separate.
 */
export function SiteMarkers({
  sites,
  selectedId,
  onSelect,
}: {
  sites: SiteDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {sites.map((site) => (
        <SinglePin
          key={site.id}
          site={site}
          selected={selectedId === site.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function SinglePin({
  site,
  selected,
  onSelect,
}: {
  site: SiteDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = SITE_TYPE_ICON[site.type];
  const { level, label: confidenceLabel } = confidence(site);

  return (
    <MapMarker
      longitude={site.longitude}
      latitude={site.latitude}
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
