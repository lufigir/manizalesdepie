"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import { RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { SelectedMarkerLabel } from "./marker-label";

type Located = ResourceOfferDTO & { longitude: number; latitude: number };

/**
 * Offers on the map — a truck, a warehouse, a spare room.
 *
 * Dashed ring rather than a solid fill, the same visual borrowed from
 * `SightingMarkers`: the point here is a barrio's own centroid, not the exact
 * corner where the volqueta is parked, so the marker has to look like an
 * approximation or it reads as more precise than it is.
 *
 * Several offers from the same barrio commonly share that exact centroid, and
 * they are drawn stacked on it rather than fanned out around it. The dashed
 * ring is already saying "this is the barrio, not the corner"; nudging the
 * pins apart would draw a precision the data does not have, on the one family
 * where the point was never exact to begin with. The panel is where several
 * offers in one barrio get read apart.
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

  return (
    <>
      {located.map((offer) => (
        <SinglePin
          key={offer.id}
          offer={offer}
          selected={selectedId === offer.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function SinglePin({
  offer,
  selected,
  onSelect,
}: {
  offer: Located;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = RESOURCE_TYPE_ICON[offer.type];

  return (
    <MapMarker
      longitude={offer.longitude}
      latitude={offer.latitude}
      onClick={() => onSelect(offer.id)}
    >
      <MarkerContent>
        <span className="relative block">
        <span
          className={cn(
            "border-muted-foreground/60 bg-background text-foreground ring-background flex size-7 items-center justify-center rounded-full border-2 border-dashed shadow-md ring-2 transition-transform",
            selected && "scale-125",
          )}
          aria-label={`${RESOURCE_TYPE_LABEL[offer.type]}: ${offer.description}`}
        >
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        {selected && (
          <SelectedMarkerLabel>{RESOURCE_TYPE_LABEL[offer.type]}</SelectedMarkerLabel>
        )}
        </span>
      </MarkerContent>
      {!selected && (
        <MarkerTooltip offset={18}>{RESOURCE_TYPE_LABEL[offer.type]}</MarkerTooltip>
      )}
    </MapMarker>
  );
}
