"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import { RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useClusters } from "./use-clusters";

type Located = ResourceOfferDTO & { longitude: number; latitude: number };

/**
 * Offers on the map — a truck, a warehouse, a spare room.
 *
 * Dashed ring rather than a solid fill, the same visual borrowed from
 * `SightingMarkers`: the point here is a barrio's own centroid, not the exact
 * corner where the volqueta is parked, so the marker has to look like an
 * approximation or it reads as more precise than it is.
 *
 * Clustered like sites — several offers from the same barrio commonly share
 * that exact centroid, which is the single densest point this map draws.
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
  const clusters = useClusters(located);

  return (
    <>
      {clusters.map((cluster) =>
        cluster.items.length === 1 ? (
          <SinglePin
            key={cluster.key}
            offer={cluster.items[0]}
            selected={selectedId === cluster.items[0].id}
            onSelect={onSelect}
          />
        ) : (
          <MapMarker
            key={cluster.key}
            longitude={cluster.longitude}
            latitude={cluster.latitude}
          >
            <MarkerContent>
              <span
                className="ring-background bg-background text-foreground flex size-8 items-center justify-center rounded-full border-2 border-dashed shadow-md ring-2"
                aria-label={`${cluster.items.length} servicios ofrecidos aquí.`}
              >
                <span className="text-xs font-bold tabular-nums">
                  {cluster.items.length}
                </span>
              </span>
            </MarkerContent>
            <MarkerTooltip offset={20}>
              {cluster.items
                .slice(0, 4)
                .map((o) => RESOURCE_TYPE_LABEL[o.type])
                .join(" · ")}
            </MarkerTooltip>
          </MapMarker>
        ),
      )}
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
        <span
          className={cn(
            "border-muted-foreground/60 bg-background text-foreground ring-background flex size-7 items-center justify-center rounded-full border-2 border-dashed shadow-md ring-2 transition-transform",
            selected && "scale-125",
          )}
          aria-label={`${RESOURCE_TYPE_LABEL[offer.type]}: ${offer.description}`}
        >
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
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
