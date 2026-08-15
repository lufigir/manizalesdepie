"use client";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";

import type {
  NeighborhoodStatusDTO,
  UtilityStatus,
} from "@/data/neighborhood/neighborhood.dto";
import { BARRIO_PANEL, NEIGHBORHOOD_STATUS_LABEL, PANEL_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

/** Which utilities a status marks as suspended, in the order the card shows
 *  them elsewhere: gas, power, water. */
function suspendedUtilities(status: NeighborhoodStatusDTO): string[] {
  const entries: [UtilityStatus, string][] = [
    [status.gasStatus, NEIGHBORHOOD_STATUS_LABEL.gas],
    [status.powerStatus, NEIGHBORHOOD_STATUS_LABEL.power],
    [status.waterStatus, NEIGHBORHOOD_STATUS_LABEL.water],
  ];
  return entries
    .filter(([value]) => value === "suspended")
    .map(([, label]) => label);
}

/**
 * The panel's one header: where it is looking, how much is in it, and the
 * control that opens and closes it.
 *
 * These used to be two rows — a bare strip holding nothing but a chevron,
 * above a context row — which on a phone spent a whole line of a panel that
 * is already the scarcest space in the app. Merging them also fixes what
 * collapsing used to leave behind: an empty bar that said nothing, where now
 * a shut panel still reports the barrio and the count, so it reads as a
 * closed drawer rather than a dead edge.
 *
 * Collapsing works at every width now. On a phone it frees height for the
 * map; on a desktop it frees width, which was simply not possible before —
 * the toggle was `lg:hidden` and the aside's width was fixed, so a laptop
 * could never give the map the whole screen.
 */
export function BarrioHeader() {
  const {
    barrio,
    clearBarrio,
    barrioStatus,
    panelCollapsed,
    setPanelCollapsed,
    sites,
    calls,
    workOrders,
    animals,
    resourceOffers,
  } = useWorkspace();

  const total =
    sites.length +
    calls.length +
    workOrders.length +
    animals.filter((animal) => animal.resolvedAt === null).length +
    resourceOffers.length;

  const suspended = barrioStatus ? suspendedUtilities(barrioStatus) : [];
  const alert = barrioStatus?.evacuated
    ? NEIGHBORHOOD_STATUS_LABEL.bannerEvacuated
    : suspended.length > 0
      ? `${NEIGHBORHOOD_STATUS_LABEL.bannerUtility} ${suspended.join(", ")}.`
      : null;

  const toggleLabel = panelCollapsed ? PANEL_LABEL.expand : PANEL_LABEL.collapse;

  // Collapsed on a wide screen the aside is a narrow rail with no room for a
  // line of text, so it carries the toggle alone, turned to face the map.
  if (panelCollapsed) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          aria-label={toggleLabel}
          aria-expanded={false}
          className="hover:bg-accent focus-visible:ring-ring hidden h-full w-full items-start justify-center pt-3 transition-colors focus-visible:ring-2 focus-visible:outline-none lg:flex"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <CollapsedBar
          label={barrio ? barrio.name : BARRIO_PANEL.wholeCity}
          total={total}
          onExpand={() => setPanelCollapsed(false)}
          toggleLabel={toggleLabel}
        />
      </>
    );
  }

  return (
    <div className="shrink-0 border-b">
      <div className="bg-accent/40 flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            {barrio ? barrio.name : BARRIO_PANEL.wholeCity}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {barrio?.comuna && `${BARRIO_PANEL.comuna(barrio.comuna)} · `}
            {total === 1 ? PANEL_LABEL.itemsOne : PANEL_LABEL.itemsMany(total)}
          </p>
        </div>

        {barrio && (
          <button
            type="button"
            onClick={clearBarrio}
            className="hover:bg-accent focus-visible:ring-ring flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-3" aria-hidden />
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
          className="hover:bg-accent focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown className="size-4 lg:hidden" aria-hidden />
          <ChevronRight className="hidden size-4 lg:block" aria-hidden />
        </button>
      </div>

      {/* Only for a barrio an announcement actually named — most never show
          this. Evacuation takes the red the map also uses for it; a utility on
          its own gets the lighter, "in progress" amber. */}
      {alert && (
        <div
          className={cn(
            "flex items-start gap-2 px-3 py-2 text-xs",
            barrioStatus?.evacuated
              ? "bg-unclaimed-surface text-unclaimed"
              : "bg-claimed-surface text-claimed",
          )}
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{alert}</span>
        </div>
      )}
    </div>
  );
}

/** The shut panel on a phone: still says where it is looking and how much is
 *  inside, and the whole bar is the way back — a chevron alone was a target
 *  the size of a thumbnail on the surface where thumbs are the input. */
function CollapsedBar({
  label,
  total,
  onExpand,
  toggleLabel,
}: {
  label: string;
  total: number;
  onExpand: () => void;
  toggleLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={toggleLabel}
      aria-expanded={false}
      className="hover:bg-accent focus-visible:ring-ring flex h-full w-full items-center gap-2 px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none lg:hidden"
    >
      <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
        {label}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {total === 1 ? PANEL_LABEL.itemsOne : PANEL_LABEL.itemsMany(total)}
      </span>
      <ChevronUp className="size-4 shrink-0" aria-hidden />
    </button>
  );
}
