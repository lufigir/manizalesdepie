"use client";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import { ANIMAL_LABEL } from "@/lib/labels";
import type { FanOffsets } from "@/lib/marker-fan";
import { cn } from "@/lib/utils";

import { SelectedMarkerLabel } from "./marker-label";

/**
 * Where an animal was last SEEN — never where it is.
 *
 * Drawn as a dashed ring with no fill, deliberately unlike every other marker
 * on this map. A solid pin means "this is here", and for a lost animal that is
 * false by definition: it was somewhere, once, and has been moving since. The
 * marker has to look like a trace rather than a location or it will be read as
 * one, and someone will search the wrong block.
 *
 * Reports with no coordinate at all simply do not appear — most will be like
 * that, and the board beside the map is where they live.
 */
export function SightingMarkers({
  animals,
  selectedId,
  onSelect,
  offsets,
}: {
  animals: AnimalDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fixed nudge for the sightings sharing one exact coordinate with anything
   *  else on the map — see `lib/marker-fan.ts`. */
  offsets: FanOffsets;
}) {
  const located = animals.filter(
    (animal) =>
      animal.longitude !== null &&
      animal.latitude !== null &&
      animal.resolvedAt === null,
  );

  return (
    <>
      {located.map((animal) => (
        <MapMarker
          key={animal.id}
          longitude={animal.longitude!}
          latitude={animal.latitude!}
          offset={offsets.get(animal.id)}
          onClick={() => onSelect(animal.id)}
        >
          <MarkerContent>
            <span className="relative block">
              <span
                className={cn(
                  "border-unclaimed bg-unclaimed/15 block size-6 rounded-full border-2 border-dashed transition-transform",
                  selectedId === animal.id && "scale-125",
                )}
                aria-label={`${ANIMAL_LABEL[animal.kind]}: ${
                  animal.petName ?? ANIMAL_LABEL[animal.species]
                }. ${ANIMAL_LABEL.seenAt} aquí.`}
              />
              {selectedId === animal.id && (
                <SelectedMarkerLabel>
                  {ANIMAL_LABEL.seenAt} aquí ·{" "}
                  {animal.petName ?? ANIMAL_LABEL[animal.species]}
                </SelectedMarkerLabel>
              )}
            </span>
          </MarkerContent>
          {selectedId !== animal.id && (
            <MarkerTooltip offset={18}>
              {ANIMAL_LABEL.seenAt} aquí ·{" "}
              {animal.petName ?? ANIMAL_LABEL[animal.species]}
            </MarkerTooltip>
          )}
        </MapMarker>
      ))}
    </>
  );
}
