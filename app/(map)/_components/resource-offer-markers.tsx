"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import { RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useSpreadPins } from "./use-clusters";

type Located = ResourceOfferDTO & { longitude: number; latitude: number };

/**
 * Offers on the map — a truck, a warehouse, a spare room.
 *
 * Dashed ring rather than a solid fill, the same visual borrowed from
 * `SightingMarkers`: the point here is a barrio's own centroid, not the exact
 * corner where the volqueta is parked, so the marker has to look like an
 * approximation or it reads as more precise than it is.
 *
 * Spread apart like sites — several offers from the same barrio commonly
 * share that exact centroid, which is the single densest point this map
 * draws — so `useSpreadPins` earns its keep here more than anywhere else.
 */
export function ResourceOfferMarkers({
  resourceOffers,
  selectedId,
  onSelect,
}: {
  resourceOffers: ResourceOfferDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const located = resourceOffers.filter(
    (offer): offer is Located =>
      offer.longitude !== null && offer.latitude !== null,
  );
  const pins = useSpreadPins(located);

  return (
    <>
      {pins.map(({ item, longitude, latitude, offsetX, offsetY }) => (
        <SinglePin
          key={item.id}
          offer={item}
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
  offer,
  longitude,
  latitude,
  offsetX,
  offsetY,
  selected,
  onSelect,
}: {
  offer: Located;
  longitude: number;
  latitude: number;
  offsetX: number;
  offsetY: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = RESOURCE_TYPE_ICON[offer.type];
  const spread = offsetX !== 0 || offsetY !== 0;

  return (
    <MapMarker
      longitude={longitude}
      latitude={latitude}
      onClick={() => onSelect(offer.id)}
    >
      <MarkerContent>
        <span
          className="block transition-transform duration-200"
          style={spread ? { transform: `translate(${offsetX}px, ${offsetY}px)` } : undefined}
        >
          <span
            className={cn(
              "border-muted-foreground/60 bg-background text-foreground ring-background flex size-7 items-center justify-center rounded-full border-2 border-dashed shadow-md ring-2 transition-transform",
              selected && "scale-125",
            )}
            aria-label={`${RESOURCE_TYPE_LABEL[offer.type]}: ${offer.description}`}
          >
            <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
        </span>
      </MarkerContent>
      {!selected && (
        <MarkerTooltip offset={18}>
          {RESOURCE_TYPE_LABEL[offer.type]}
        </MarkerTooltip>
      )}
    </MapMarker>
  );
}
