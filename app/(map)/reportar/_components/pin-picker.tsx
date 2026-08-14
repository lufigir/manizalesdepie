"use client";

import { useEffect } from "react";
import { MapPin } from "lucide-react";

import { Map, MapControls, useMap } from "@/components/ui/map";

/**
 * Places the pin by moving the map under a fixed crosshair, rather than by
 * dragging a marker.
 *
 * The difference matters on a phone. Dragging a marker means the finger covers
 * the exact spot being aimed at, and the target is a 28px circle. Moving the
 * map keeps the target dead centre and always visible, and the whole screen is
 * the handle. It is how every ride-hailing app asks the same question, so
 * nobody has to learn it.
 */
function ReportCentre({
  onMove,
}: {
  onMove: (lngLat: { lng: number; lat: number }) => void;
}) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;

    const report = () => onMove(map.getCenter());
    report();

    // moveend, not move: the value is only needed when the gesture settles, and
    // firing per frame would re-render the form sixty times a second.
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [map, onMove]);

  return null;
}

/**
 * Re-aims the camera when the reporter picks a barrio.
 *
 * `center` on <Map> only applies on mount, so without this the picker would
 * stay wherever it opened and choosing a barrio would do nothing visible —
 * which is the entire point of asking for the barrio first.
 *
 * The target arrives as two numbers rather than as a tuple, and that is not
 * cosmetic. A `[lng, lat]` prop is a fresh array on every render, so the effect
 * below re-runs on every render, jumps the map, fires `moveend`, updates the
 * form's point, renders again — an infinite loop that React reports as
 * "Maximum update depth exceeded" and which is invisible in a code review.
 * Primitives cannot do that.
 *
 * `jumpTo` rather than `flyTo`: this is not a place on screen the reader is
 * tracking, it is a change of subject, and animating four kilometres of tiles
 * over a bad connection shows a grey blur and nothing else.
 */
function FocusOn({
  longitude,
  latitude,
}: {
  longitude: number | null;
  latitude: number | null;
}) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || longitude === null || latitude === null) return;
    map.jumpTo({ center: [longitude, latitude], zoom: 15.5 });
  }, [map, longitude, latitude]);

  return null;
}

export function PinPicker({
  center,
  focusLongitude = null,
  focusLatitude = null,
  onMove,
}: {
  center: [number, number];
  /** Where to re-frame when the barrio changes. Null leaves the camera alone,
   *  which is what the animal form wants: there the map is aimed by hand. */
  focusLongitude?: number | null;
  focusLatitude?: number | null;
  onMove: (lngLat: { lng: number; lat: number }) => void;
}) {
  return (
    <div className="relative h-56 overflow-hidden rounded-xl border">
      <Map className="h-full w-full" center={center} zoom={15}>
        <MapControls position="bottom-right" showZoom showLocate />
        <FocusOn longitude={focusLongitude} latitude={focusLatitude} />
        <ReportCentre onMove={onMove} />
      </Map>

      {/* The crosshair sits in the overlay, not on the map, so it never moves.
          pointer-events-none keeps every gesture going to the map underneath. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <MapPin
          className="text-unclaimed size-8 -translate-y-3 drop-shadow-md"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </div>
  );
}
