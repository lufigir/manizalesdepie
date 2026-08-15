"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { X } from "lucide-react";

import { MapPopup } from "@/components/ui/map";
import { MAP_CARD } from "@/lib/labels";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

/**
 * Where a selected pin's card opens — one component, two answers.
 *
 * The anchored popup was, and still is, the right shape beside the map: the
 * answer and its place on the map stay on screen together, which is the whole
 * reason the card is not a sheet. What that argument never survived is a
 * phone. Below `lg` the map is stacked above the panel, so a card capped at
 * `58dvh` was being anchored inside a region barely bigger than itself,
 * hanging off the top edge and pushing its own pin out of frame.
 *
 * The drawer keeps what the popup was defending. It is NOT modal: no
 * backdrop, no focus trap, no scroll lock. The map above it stays live and
 * draggable, and the camera reframes the pin into the space the drawer
 * leaves (see `FlyToSelected`'s `bottomInset`), so the answer and its place
 * are still on screen together — just stacked instead of anchored.
 *
 * It also sits INSIDE the map's own container rather than pinned to the
 * viewport, which is what keeps the collapsed panel's bar reachable
 * underneath and lets the camera measure its inset in plain canvas pixels.
 *
 * Base UI's Dialog is deliberately not used here: every one of its jobs
 * (backdrop, focus trap, dismiss-on-outside-press) is a job this surface does
 * not want, and its outside-press dismissal fires on `pointerdown`, which
 * would close the card at the start of every drag across the map.
 */
export function MapCard({
  longitude,
  latitude,
  onClose,
  onHeightChange,
  children,
}: {
  /** Null for the things that have no point at all — a lost animal, a truck
   *  somebody lends across the whole city. Those never get the anchored
   *  popup, at any width: there is nothing to anchor to. */
  longitude: number | null;
  latitude: number | null;
  onClose: () => void;
  /** How much of the map the card is covering, so the camera can lift the
   *  pin clear of it. Reports 0 on unmount and while the popup is the one
   *  rendering, which anchors instead of covering. */
  onHeightChange: (height: number) => void;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const located = longitude !== null && latitude !== null;

  if (isDesktop && located) {
    return (
      <AnchoredCard longitude={longitude} latitude={latitude} onClose={onClose}>
        {children}
      </AnchoredCard>
    );
  }

  return (
    <BottomCard onClose={onClose} onHeightChange={onHeightChange}>
      {children}
    </BottomCard>
  );
}

/** Beside the map: unchanged from what every card did before, including
 *  `closeOnClick={false}` so panning does not dismiss it mid-read and
 *  `focusAfterOpen={false}` so it never scrolls the page out from under
 *  somebody. */
function AnchoredCard({
  longitude,
  latitude,
  onClose,
  children,
}: {
  longitude: number;
  latitude: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <MapPopup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      closeButton
      closeOnClick={false}
      focusAfterOpen={false}
      offset={22}
      className="max-h-[58dvh] w-[min(20rem,calc(100vw-2.5rem))] max-w-none overflow-y-auto"
    >
      {children}
    </MapPopup>
  );
}

/**
 * Under the map: the drawer.
 *
 * `max-h`, not `h` — a two-line offer takes two lines. A card that always
 * claimed 55dvh would be covering half the map to show whitespace, and the
 * camera would be lifting the pin clear of nothing.
 */
function BottomCard({
  onClose,
  onHeightChange,
  children,
}: {
  onClose: () => void;
  onHeightChange: (height: number) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Both listeners are attached once and must survive every re-render the
  // card's own content causes — an admin editing a field would otherwise
  // tear down the ResizeObserver on each keystroke and re-fly the camera
  // under the reader.
  const report = useEffectEvent((height: number) => onHeightChange(height));
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      report(entry.contentRect.height);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      report(0);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={MAP_CARD.region}
      className="bg-background animate-in slide-in-from-bottom-4 fade-in absolute inset-x-0 bottom-0 z-20 flex max-h-[55dvh] flex-col rounded-t-xl border-t shadow-[0_-4px_16px_-4px_rgb(0_0_0/0.15)] duration-200"
    >
      {/* A bar of its own, rather than a button floating in the corner.
          Floating, it had to be kept clear with padding down the whole right
          edge — a permanent empty column beside every row of the card, to
          make room for one control at the top of it. As a bar it costs 28px
          of height once, and every line underneath gets the full width.

          The pill in the middle is the affordance: it is what a sheet that
          can be dismissed looks like on this platform, and it says so
          without a word. */}
      <div className="relative flex h-7 shrink-0 items-center justify-center">
        <span className="bg-muted-foreground/30 h-1 w-9 rounded-full" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label={MAP_CARD.close}
          className="hover:bg-accent focus-visible:ring-ring absolute end-1.5 flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {/* The card's own scroll, so "ver más" can unfold inside it without
          the drawer growing past the cap and swallowing the map.

          Capped and centred: below `lg` this drawer is as wide as the screen,
          which on a portrait tablet is 800px of line length for text sized
          for a phone. The cap costs nothing at 390px and keeps the card
          readable at 900. */}
      <div className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto overscroll-contain px-3 pt-0.5 pb-3">
        {children}
      </div>
    </div>
  );
}
