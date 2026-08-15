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

import { useSpreadPins } from "./use-clusters";

/**
 * Every pin on the map, spread apart when they would otherwise sit on top of
 * each other. Downtown Manizales puts a dozen hospitals inside a few blocks,
 * which at city zoom would collapse to one spot — `useSpreadPins` pushes the
 * group onto a small ring instead of hiding it behind a count, so what is
 * drawn is always the real icon of a real place, never a number standing in
 * for one.
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
  const pins = useSpreadPins(sites);

  return (
    <>
      {pins.map(({ item, longitude, latitude, offsetX, offsetY }) => (
        <SinglePin
          key={item.id}
          site={item}
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
  site,
  longitude,
  latitude,
  offsetX,
  offsetY,
  selected,
  onSelect,
}: {
  site: SiteDTO;
  longitude: number;
  latitude: number;
  offsetX: number;
  offsetY: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = SITE_TYPE_ICON[site.type];
  const { level, label: confidenceLabel } = confidence(site);
  const spread = offsetX !== 0 || offsetY !== 0;

  return (
    <MapMarker
      longitude={longitude}
      latitude={latitude}
      onClick={() => onSelect(site.id)}
    >
      <MarkerContent>
        {/* The nudge away from a shared centroid — zero for a pin with the
            map to itself. A CSS transform, never a fake coordinate: what the
            map claims about where this is stays exactly what the data says. */}
        <span
          className="block transition-transform duration-200"
          style={spread ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : undefined}
        >
          {/* The icon says what it is, the fill says whether it helps right
              now, and the solidity says how much anyone has vouched for it.
              Three facts, three channels, no legend needed to read the
              first one. */}
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
        </span>
      </MarkerContent>
      {/* Names the pin before committing to a tap. Cheap on desktop, ignored
          on touch, and it makes a dense area readable. Suppressed once
          selected: a click never moves the cursor off the marker, so the
          tooltip would otherwise sit on top of the popup card it just
          opened. */}
      {!selected && <MarkerTooltip offset={20}>{site.name}</MarkerTooltip>}
    </MapMarker>
  );
}
