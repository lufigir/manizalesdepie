import { cn } from "@/lib/utils";

/**
 * The name of the pin the open card is about, pinned above it.
 *
 * `MarkerTooltip` (mapcn's) only exists while the cursor is over the marker,
 * which is the wrong lifetime for a selection: the reader taps a pin, the
 * card opens on the far side of the screen, and the pin they are reading
 * about goes back to being one shape among thirty — on a phone, where
 * nothing hovers, it was never labelled at all.
 *
 * Written here rather than by adding an `open` prop to `MarkerTooltip`,
 * because `components/ui/` belongs to the mapcn CLI and an edit there is lost
 * on the next update (see AGENTS.md). Same visual language as that tooltip on
 * purpose — a reader should not be able to tell that the label which followed
 * their cursor and the one that stayed are two different components.
 *
 * Renders inside `MarkerContent`, so it needs a positioned ancestor there.
 */
export function SelectedMarkerLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // `pointer-events-none` so it never eats the tap meant for the pin
        // underneath it, and z-10 so it clears neighbouring markers rather
        // than being overdrawn by whichever one MapLibre painted last.
        "bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap shadow-md",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}
