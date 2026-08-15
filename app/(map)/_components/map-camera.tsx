"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { MapMouseEvent as MapLibreMouseEvent } from "maplibre-gl";

import { useMap } from "@/components/ui/map";

import type { CardInset } from "./map-card";

/**
 * Anything with a coordinate. Both of these care about where something is and
 * about nothing else, so they take the coordinate rather than the entity — which
 * is what lets one camera frame acopios and grupos together instead of the
 * map opening on half of what it draws.
 */
type Located = { longitude: number; latitude: number };

/**
 * Camera control, lifted from mapcn's store-locator pattern: a component that
 * renders nothing, sits inside <Map>, and drives the camera through useMap().
 *
 * This replaces passing `center`/`zoom` as props, which only apply on mount —
 * so a shared link that arrived after the map was already up never moved it.
 */

/**
 * Frames everything on screen once, on load.
 *
 * The fixed city-wide zoom was wrong in practice: the published points sit in a
 * few blocks of Palogrande, and the map opened so far out they were a speck.
 * Whatever exists should fill the screen, whether that is five pins or two
 * hundred.
 */
export function FitToSites({ sites }: { sites: Located[] }) {
  const { map } = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (!map || done.current || sites.length === 0) return;
    done.current = true;

    const lons = sites.map((s) => s.longitude);
    const lats = sites.map((s) => s.latitude);

    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      {
        padding: { top: 120, bottom: 80, left: 64, right: 64 },
        // Capped well short of street level on purpose. Framed tighter, the
        // reader lands inside a single comuna with no idea which part of the
        // city they are looking at — the pins gain nothing and the context is
        // lost. This keeps a few comunas and their boundaries in frame.
        maxZoom: 14,
        duration: 0,
      },
    );
  }, [map, sites]);

  return null;
}

/**
 * Flies to the selected pin so its card never covers the thing it describes.
 *
 * `inset` is how much of the map the card is sitting on, measured by
 * `MapCard`: the drawer's height under `lg`, the left sheet's width from
 * `lg` up. Centring the pin in what is LEFT is the whole trick that lets a
 * sheet replace the anchored popup on either size without losing what the
 * anchoring was for.
 *
 * A one-shot `offset` rather than the map's `padding` option on purpose:
 * padding is sticky, so every later `fitBounds` and `flyTo` would inherit a
 * frame shifted by a card that closed minutes ago.
 */
export function FlyToSelected({
  site,
  inset = { bottom: 0, left: 0 },
}: {
  site: Located | null;
  inset?: CardInset;
}) {
  const { map } = useMap();
  const { bottom, left } = inset;

  useEffect(() => {
    if (!map || !site) return;

    map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: Math.max(map.getZoom(), 15),
      // Half of whatever the card covers: the pin lands in the middle of the
      // strip of map still visible beside or above it. Positive x pushes the
      // pin right, clear of the left sheet; negative y lifts it above the
      // drawer.
      offset: [left / 2, -bottom / 2],
      duration: 700,
      // Keeps the animation running even if the user prefers reduced motion
      // elsewhere; losing the pin is worse than the movement.
      essential: true,
    });
  }, [map, site, bottom, left]);

  return null;
}

/**
 * A tap on bare map closes whatever card is open.
 *
 * MapLibre's own `click` already tells a tap apart from a drag — it does not
 * fire after a pan — which is the distinction that matters most here: reading
 * a card and dragging the map to see where the pin sits is one gesture, and
 * it must not dismiss what it is being used to read.
 *
 * The target check does the other half. Markers are DOM elements inside the
 * canvas container, so a click on one bubbles up and fires this too; without
 * the check, selecting a pin would immediately deselect it.
 */
export function ClearSelectionOnTap({ onTap }: { onTap: () => void }) {
  const { map } = useMap();

  // The listener is bound once, to the map, and must not be torn down and
  // rebound every time the parent re-renders a new closure — which is
  // precisely what `useEffectEvent` is for.
  const clear = useEffectEvent(() => onTap());

  useEffect(() => {
    if (!map) return;

    const handle = (event: MapLibreMouseEvent) => {
      if (event.originalEvent.target !== map.getCanvas()) return;
      clear();
    };

    map.on("click", handle);
    return () => {
      map.off("click", handle);
    };
  }, [map]);

  return null;
}
