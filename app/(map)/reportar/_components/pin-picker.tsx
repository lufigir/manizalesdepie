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

export function PinPicker({
  center,
  onMove,
}: {
  center: [number, number];
  onMove: (lngLat: { lng: number; lat: number }) => void;
}) {
  return (
    <div className="relative h-56 overflow-hidden rounded-xl border">
      <Map className="h-full w-full" center={center} zoom={15}>
        <MapControls position="bottom-right" showZoom showLocate />
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
