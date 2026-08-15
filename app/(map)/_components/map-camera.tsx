"use client";

import { useEffect, useRef } from "react";

import { useMap } from "@/components/ui/map";

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

/** Flies to the selected pin so its card is never anchored off-screen. */
export function FlyToSelected({ site }: { site: Located | null }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !site) return;

    map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: Math.max(map.getZoom(), 15),
      duration: 700,
      // Keeps the animation running even if the user prefers reduced motion
      // elsewhere; losing the pin is worse than the movement.
      essential: true,
    });
  }, [map, site]);

  return null;
}
