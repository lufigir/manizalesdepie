"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The one breakpoint this app changes behaviour at, not just layout.
 *
 * `lg` and not `md`, matching `MapWorkspace`'s own stacked/side-by-side
 * split: below it the panel sits under the map and a selected pin opens a
 * bottom card; from it the panel sits beside the map and a pin opens its
 * anchored popup. Kept here rather than typed twice, because a component
 * reading a different number than the layout does is a bug nobody sees until
 * a tablet lands between the two.
 */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * A media query as React state.
 *
 * The server has no viewport, so it always answers `false` — the phone
 * layout. That is the deliberate direction of the guess: this is a map people
 * open from a WhatsApp link on a phone in the street, and a desktop reader
 * pays for it with one frame of a bottom card before the popup takes over,
 * which is the cheaper of the two mistakes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
