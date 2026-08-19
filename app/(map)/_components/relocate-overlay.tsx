"use client";

import { useEffect, useState, useTransition } from "react";
import { MapPin, X } from "lucide-react";

import { useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import { relocateSite } from "@/data/site/site.actions";
import { relocateNeed } from "@/data/need/need.actions";
import { RELOCATE_LABEL } from "@/lib/labels";

import { BarrioPicker } from "../reportar/_components/barrio-picker";

/** What is being moved. Only the two families whose point is an exact place:
 *  an animal sighting is a trace and a service is pinned at its barrio's
 *  centroid, so neither has a "wrong corner" to correct. */
export type Relocating = {
  id: string;
  kind: "site" | "need";
  /** Where the pin sits now, so the camera can open on it and Cancel has
   *  something to mean. */
  longitude: number;
  latitude: number;
};

/**
 * Aims the live map at the pin being moved, and reports back where the centre
 * lands.
 *
 * Renders inside `<Map>` because that is the only place `useMap` resolves.
 * The crosshair itself is NOT here — it belongs to the overlay below, outside
 * the map, so it cannot drift by a pixel while the tiles move.
 *
 * The map moves under a fixed crosshair rather than the marker being dragged,
 * the same choice `PinPicker` makes and for the same reason: on a phone a
 * dragging finger covers the exact spot being aimed at, and the target here is
 * a 28-pixel circle.
 */
export function RelocateCentre({
  longitude,
  latitude,
  onMove,
}: {
  longitude: number;
  latitude: number;
  onMove: (lngLat: { lng: number; lat: number }) => void;
}) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    map.flyTo({ center: [longitude, latitude], zoom: 17, duration: 600 });
  }, [map, longitude, latitude]);

  useEffect(() => {
    if (!map) return;

    const report = () => onMove(map.getCenter());
    report();

    // moveend, not move: the value is only needed once the gesture settles.
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [map, onMove]);

  return null;
}

/**
 * Flies the map to a barrio the reader named. Kept apart from
 * `RelocateCentre` so choosing a barrio does not re-run the effect that
 * frames the pin, which would fight it.
 */
export function RelocateBarrioFocus({
  barrio,
}: {
  barrio: NeighborhoodDTO | null;
}) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !barrio) return;
    map.flyTo({ center: [barrio.longitude, barrio.latitude], zoom: 15.5 });
  }, [map, barrio]);

  return null;
}

/**
 * The crosshair, and the panel that saves or abandons the move.
 *
 * Sits over the map rather than inside it: a marker drawn on the map moves
 * with the map, and this one must not — it is the thing the map is being
 * aimed at.
 *
 * The barrio picker is here because "arrastra el mapa hasta la esquina" is a
 * fine instruction when you are already looking at the right block and a
 * useless one when the pin opened four kilometres away, which is exactly the
 * case for the seeded rows whose coordinates AGENTS.md warns are approximate.
 */
export function RelocateOverlay({
  target,
  point,
  barrios,
  barrio,
  onBarrioChange,
  onDone,
  onCancel,
}: {
  target: Relocating;
  /** Where the map is centred right now — what would be saved. */
  point: { lng: number; lat: number };
  barrios: NeighborhoodDTO[];
  barrio: NeighborhoodDTO | null;
  onBarrioChange: (barrio: NeighborhoodDTO | null) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        if (target.kind === "site") {
          await relocateSite(target.id, point.lng, point.lat);
        } else {
          await relocateNeed(target.id, point.lng, point.lat);
        }
        onDone();
      } catch (cause) {
        // The DAL's refusal is the message worth showing — "solo puedes mover
        // el punto dentro de su propio barrio" is the whole rule, said once,
        // at the moment somebody hits it.
        const message =
          cause instanceof Error ? cause.message : RELOCATE_LABEL.failed;
        setError(message.startsWith("[") ? RELOCATE_LABEL.failed : message);
      }
    });
  }

  return (
    <>
      {/* The crosshair. pointer-events-none so every gesture reaches the map
          underneath it. */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <MapPin
          className="text-primary size-10 -translate-y-4 drop-shadow-lg"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3">
        <div className="bg-background pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-xl border p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">
                {RELOCATE_LABEL.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {RELOCATE_LABEL.hint}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label={RELOCATE_LABEL.cancel}
              className="hover:bg-accent focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* Collapsed by default: the common correction is a few metres, and
              a 118-entry list opened over the map for all of them would bury
              the two buttons that finish the job. */}
          {pickerOpen ? (
            <BarrioPicker
              barrios={barrios}
              value={barrio}
              onChange={(next) => {
                onBarrioChange(next);
                if (next) setPickerOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="hover:bg-accent focus-visible:ring-ring rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {barrio ? RELOCATE_LABEL.barrioChosen(barrio.name) : RELOCATE_LABEL.barrioJump}
            </button>
          )}

          {error && (
            <p role="alert" className="text-pending text-xs font-medium">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" loading={pending} onClick={save}>
              {pending ? RELOCATE_LABEL.saving : RELOCATE_LABEL.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {RELOCATE_LABEL.cancel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
