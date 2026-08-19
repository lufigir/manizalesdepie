"use client";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
  X,
} from "lucide-react";

import { BARRIO_PANEL, PANEL_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

/**
 * The panel's one header: where it is looking, how much is in it, and the
 * control that opens and closes it.
 *
 * One row, not two: a bare strip holding nothing but a chevron would spend
 * a whole line of a panel that is already the scarcest space in the app on
 * a phone. A shut panel still reports the barrio and the count, so it reads
 * as a closed drawer rather than a dead edge.
 *
 * Collapsing works at every width. On a phone it frees height for the map;
 * on a desktop it frees width, giving the map the whole screen when the
 * aside is not needed.
 */
export function BarrioHeader() {
  const {
    barrio,
    clearBarrio,
    panelCollapsed,
    setPanelCollapsed,
    sites,
    needs,
    animals,
    services,
  } = useWorkspace();

  const total =
    sites.length +
    needs.length +
    animals.filter((animal) => animal.resolvedAt === null).length +
    services.length;

  const toggleLabel = panelCollapsed ? PANEL_LABEL.expand : PANEL_LABEL.collapse;

  // Collapsed on a wide screen the aside is a narrow rail with no room for a
  // line of text, so it carries the toggle alone, turned to face the map.
  // While a barrio is filtered, it also carries the same X that clears it:
  // a shut panel is the default state for most of a visit, and a filter the
  // reader cannot dismiss without opening the panel reads as stuck.
  if (panelCollapsed) {
    const clear = barrio ? clearBarrio : undefined;
    return (
      <>
        <div className="hidden h-full w-full flex-col items-stretch lg:flex">
          <button
            type="button"
            onClick={() => setPanelCollapsed(false)}
            aria-label={toggleLabel}
            aria-expanded={false}
            className={cn(
              "focus-visible:ring-ring flex h-full min-h-0 w-full flex-1 items-start justify-center pt-3 transition-colors focus-visible:ring-2 focus-visible:outline-none",
              barrio
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            <span className="flex flex-col items-center gap-2">
              <ChevronLeft className="size-4" aria-hidden />
              {barrio ? (
                <MapPin className="size-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <Building2 className="size-4" strokeWidth={2.5} aria-hidden />
              )}
            </span>
          </button>

          {clear && (
            <button
              type="button"
              onClick={clear}
              aria-label={BARRIO_PANEL.clear}
              className="bg-primary focus-visible:ring-primary-foreground flex h-10 w-full shrink-0 items-center justify-center transition-colors hover:bg-primary-foreground/15 focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="size-4" strokeWidth={2.5} aria-hidden />
            </button>
          )}
        </div>

        <CollapsedBar
          label={barrio ? barrio.name : BARRIO_PANEL.wholeCity}
          total={total}
          filtered={barrio !== null}
          onExpand={() => setPanelCollapsed(false)}
          onClear={clear}
          toggleLabel={toggleLabel}
        />
      </>
    );
  }

  return (
    <div className="shrink-0 border-b">
      {/*
        Filtered, the whole strip goes primary.
        A barrio filter is the one piece of state in this app that silently
        changes the answer to the question the app exists to answer: the panel
        says "0 puntos" and it reads as "no hay nada", when what it means is
        "no hay nada AQUÍ". The "Ver toda la ciudad" chip was already present
        and was already the way out — it was just a bordered pill on a faint
        grey strip, which is what every other quiet control here looks like.
        Filling the header is what makes the state visible before the count is
        read, rather than explaining it afterwards.
      */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 transition-colors",
          barrio ? "bg-primary text-primary-foreground" : "bg-accent/40",
        )}
      >
        {/* The scope, as a shape.
            "Toda la ciudad" and "San Joaquín" are two different answers to
            the same question and they were two runs of text at the same
            weight — read at a glance, one looked like the other with a
            different word in it. A pin means one place; the block of
            buildings means all of them, and the fill behind it already says
            whether a filter is on. */}
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            barrio ? "bg-primary-foreground/15" : "bg-background/60",
          )}
        >
          {barrio ? (
            <MapPin className="size-4" strokeWidth={2.5} aria-hidden />
          ) : (
            <Building2 className="size-4" strokeWidth={2.5} aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            {barrio ? barrio.name : BARRIO_PANEL.wholeCity}
          </p>
          <p
            className={cn(
              "text-xs tabular-nums",
              barrio ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {barrio?.comuna && `${BARRIO_PANEL.comuna(barrio.comuna)} · `}
            {total === 1 ? PANEL_LABEL.itemsOne : PANEL_LABEL.itemsMany(total)}
          </p>
        </div>

        {barrio && (
          <button
            type="button"
            onClick={clearBarrio}
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 focus-visible:ring-primary-foreground flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-3" strokeWidth={3} aria-hidden />
            {BARRIO_PANEL.clear}
          </button>
        )}

        {/* One button, two directions: down closes a panel that sits below
            the map, right closes one that sits beside it. */}
        <button
          type="button"
          onClick={() => setPanelCollapsed(true)}
          aria-label={toggleLabel}
          aria-expanded
          className={cn(
            "focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
            barrio ? "hover:bg-primary-foreground/20" : "hover:bg-accent",
          )}
        >
          <ChevronDown className="size-4 lg:hidden" aria-hidden />
          <ChevronRight className="hidden size-4 lg:block" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** The shut panel on a phone: still says where it is looking and how much is
 *  inside, and the whole bar is the way back — a chevron alone was a target
 *  the size of a thumbnail on the surface where thumbs are the input. While a
 *  barrio is filtered, a clear X rides the right edge of the same bar, so the
 *  filter is not locked behind the expand control. */
function CollapsedBar({
  label,
  total,
  filtered,
  onExpand,
  onClear,
  toggleLabel,
}: {
  label: string;
  total: number;
  /** Whether a barrio filter is on. Carried through to the shut state on
   *  purpose: a filter the reader cannot see is a filter they will read the
   *  count against, and the panel is shut for most of a visit on a phone. */
  filtered: boolean;
  onExpand: () => void;
  onClear?: () => void;
  toggleLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-stretch lg:hidden",
        filtered && "bg-primary text-primary-foreground",
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label={toggleLabel}
        aria-expanded={false}
        className={cn(
          "focus-visible:ring-ring flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          !filtered && "hover:bg-accent",
        )}
      >
        {/* The same two icons as the open header, so the shut bar is the same
            sentence shorter rather than a different one. */}
        {filtered ? (
          <MapPin className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        ) : (
          <Building2 className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {label}
        </span>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            filtered ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {total === 1 ? PANEL_LABEL.itemsOne : PANEL_LABEL.itemsMany(total)}
        </span>
        <ChevronUp className="size-4 shrink-0" aria-hidden />
      </button>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={BARRIO_PANEL.clear}
          className="focus-visible:ring-primary-foreground flex shrink-0 items-center justify-center px-3 transition-colors hover:bg-primary-foreground/15 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-4" strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  );
}
