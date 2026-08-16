"use client";

import { PawPrint } from "lucide-react";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import { animalMapCoordinates } from "@/data/animal/animal.policy";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { ANIMAL_LABEL, ANIMAL_MARKER } from "@/lib/labels";
import type { FanOffsets } from "@/lib/marker-fan";
import { cn } from "@/lib/utils";

import { SelectedMarkerLabel } from "./marker-label";

type Located = AnimalDTO & { longitude: number; latitude: number };

/**
 * Where an animal was last SEEN — never where it is.
 *
 * Solid circle in `layer-shelter` with a paw, the same read as a sitio pin:
 * icon for what kind of thing, fill for which family. The wording everywhere
 * still says "visto", not "está", because a pin at the barrio centroid is an
 * approximation when nobody placed a sighting — not a claim the animal lives
 * on that corner.
 *
 * Exact coordinate when the reporter placed one; otherwise the centroid of the
 * barrio they named in `zone`.
 */
export function SightingMarkers({
  animals,
  barriosByName,
  selectedId,
  onSelect,
  offsets,
}: {
  animals: AnimalDTO[];
  barriosByName: ReadonlyMap<string, NeighborhoodDTO>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fixed nudge for the sightings sharing one exact coordinate with anything
   *  else on the map — see `lib/marker-fan.ts`. */
  offsets: FanOffsets;
}) {
  const located = animals.flatMap((animal): Located[] => {
    if (animal.resolvedAt !== null) return [];

    const point = animalMapCoordinates(animal, barriosByName);
    if (!point) return [];

    return [{ ...animal, longitude: point.longitude, latitude: point.latitude }];
  });

  return (
    <>
      {located.map((animal) => (
        <MapMarker
          key={animal.id}
          longitude={animal.longitude}
          latitude={animal.latitude}
          offset={offsets.get(animal.id)}
          onClick={() => onSelect(animal.id)}
        >
          <MarkerContent>
            <span className="relative block">
              <span
                className={cn(
                  "ring-background flex size-7 rotate-45 items-center justify-center rounded-md shadow-md ring-2 transition-transform",
                  ANIMAL_MARKER,
                  selectedId === animal.id && "scale-125",
                )}
                aria-label={`${ANIMAL_LABEL[animal.kind]}: ${
                  animal.petName ?? ANIMAL_LABEL[animal.species]
                }. ${ANIMAL_LABEL.seenAt} aquí.`}
              >
                <PawPrint className="-rotate-45 size-4" strokeWidth={2.5} aria-hidden />
              </span>
              {selectedId === animal.id && (
                <SelectedMarkerLabel>
                  {ANIMAL_LABEL.seenAt} aquí ·{" "}
                  {animal.petName ?? ANIMAL_LABEL[animal.species]}
                </SelectedMarkerLabel>
              )}
            </span>
          </MarkerContent>
          {selectedId !== animal.id && (
            <MarkerTooltip offset={20}>
              {ANIMAL_LABEL.seenAt} aquí ·{" "}
              {animal.petName ?? ANIMAL_LABEL[animal.species]}
            </MarkerTooltip>
          )}
        </MapMarker>
      ))}
    </>
  );
}
