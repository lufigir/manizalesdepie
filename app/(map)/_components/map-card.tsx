"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { X } from "lucide-react";

import { MAP_CARD } from "@/lib/labels";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

/** How much of the map the open card is covering, so the camera can put the
 *  pin in what is left. One axis per surface: the drawer eats height from the
 *  bottom, the sheet eats width from the left. */
export type CardInset = { bottom: number; left: number };

const NO_INSET: CardInset = { bottom: 0, left: 0 };

/**
 * Where a selected pin's card opens — one component, two answers.
 *
 * Both are sheets now: a drawer along the bottom edge under `lg`, a panel
 * along the left edge from `lg` up. Neither is modal — no backdrop, no focus
 * trap, no scroll lock — so the map stays live and draggable underneath, and
 * the camera reframes the pin into whatever space the card leaves (see
 * `FlyToSelected`).
 *
 * The desktop half used to be MapLibre's own anchored popup, pointing at the
 * pin. The argument for it was that the answer and its place stayed on screen
 * together, and that argument was right — but a popup is sized by whatever it
 * is anchored to, and the cards outgrew it: a necesidad now carries its
 * contact block, its attendee list and its actions, and a sitio shows its
 * schedule, its items, its address and its source with nothing folded away.
 * All of that inside 20rem hanging off a pin meant a card that covered its
 * own marker, flipped sides near an edge, and scrolled internally at 58dvh.
 * A left sheet holds the same content at a stable size and place; the camera
 * offset keeps the pin visible beside it, which is what the anchoring was
 * for.
 *
 * The left edge specifically: the panel owns the right (see `MapWorkspace`'s
 * aside), so the detail opens opposite it and the map keeps the middle.
 *
 * Base UI's Dialog is deliberately not used for either: every one of its jobs
 * (backdrop, focus trap, dismiss-on-outside-press) is a job this surface does
 * not want, and its outside-press dismissal fires on `pointerdown`, which
 * would close the card at the start of every drag across the map.
 */
export function MapCard({
  onClose,
  onInsetChange,
  children,
}: {
  onClose: () => void;
  /** Reports 0 on both axes when the card unmounts. */
  onInsetChange: (inset: CardInset) => void;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <CardShell
      key={isDesktop ? "side" : "bottom"}
      side={isDesktop ? "left" : "bottom"}
      onClose={onClose}
      onInsetChange={onInsetChange}
    >
      {children}
    </CardShell>
  );
}

/**
 * The surface itself, in whichever edge it is docked to.
 *
 * One component rather than two: the measuring, the Escape handling and the
 * close control were identical in both, and only the box they sit in differs.
 *
 * `max-h`/`max-w`, not fixed — a two-line offer takes two lines. A card that
 * always claimed its cap would be covering the map to show whitespace, and
 * the camera would be lifting the pin clear of nothing.
 */
function CardShell({
  side,
  onClose,
  onInsetChange,
  children,
}: {
  side: "left" | "bottom";
  onClose: () => void;
  onInsetChange: (inset: CardInset) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Both listeners are attached once and must survive every re-render the
  // card's own content causes — an admin editing a field would otherwise
  // tear down the ResizeObserver on each keystroke and re-fly the camera
  // under the reader.
  const report = useEffectEvent((inset: CardInset) => onInsetChange(inset));
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      report(side === "left" ? { bottom: 0, left: width } : { bottom: height, left: 0 });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      report(NO_INSET);
    };
  }, [side]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const docked =
    side === "left"
      ? "inset-y-0 left-0 w-[min(22rem,80vw)] border-r rounded-r-xl shadow-[4px_0_16px_-4px_rgb(0_0_0/0.15)] slide-in-from-left-4"
      : "inset-x-0 bottom-0 max-h-[55dvh] rounded-t-xl border-t shadow-[0_-4px_16px_-4px_rgb(0_0_0/0.15)] slide-in-from-bottom-4";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={MAP_CARD.region}
      className={`bg-background animate-in fade-in absolute z-20 flex flex-col duration-200 ${docked}`}
    >
      {/* A bar of its own, rather than a button floating in the corner.
          Floating, it had to be kept clear with padding down the whole right
          edge — a permanent empty column beside every row of the card, to
          make room for one control at the top of it. As a bar it costs 28px
          of height once, and every line underneath gets the full width.

          The pill is the drawer's affordance: it is what a dismissable sheet
          looks like on a phone, and it says so without a word. The left
          sheet has an edge of its own to be read against, so it gets the
          close button alone. */}
      <div className="relative flex h-7 shrink-0 items-center justify-center">
        {side === "bottom" && (
          <span className="bg-muted-foreground/30 h-1 w-9 rounded-full" aria-hidden />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={MAP_CARD.close}
          className="hover:bg-accent focus-visible:ring-ring absolute end-1.5 flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {/* The card's own scroll, so a long case can run past the edge without
          the surface growing past its cap and swallowing the map.

          Capped and centred: as a bottom drawer this is as wide as the
          screen, which on a portrait tablet is 800px of line length for text
          sized for a phone. The cap costs nothing at 390px and keeps the card
          readable at 900. */}
      <div className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto overscroll-contain px-3 pt-0.5 pb-3">
        {children}
      </div>
    </div>
  );
}
