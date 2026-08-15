"use client";

import { AlertTriangle, X } from "lucide-react";

import type {
  NeighborhoodStatusDTO,
  UtilityStatus,
} from "@/data/neighborhood/neighborhood.dto";
import { BARRIO_PANEL, NEIGHBORHOOD_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

/**
 * Context, permanently on screen — not just while a barrio is filtered by.
 *
 * It used to render nothing outside a barrio filter, which meant a city-wide
 * view carried no header at all: nothing said where the panel was looking.
 * Now it always says one of the two true things — "toda la ciudad" or a
 * barrio's name.
 */
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

export function BarrioHeader() {
  const { barrio, sites, clearBarrio, barrioStatus } = useWorkspace();

  const suspended = barrioStatus ? suspendedUtilities(barrioStatus) : [];
  const alert = barrioStatus?.evacuated
    ? NEIGHBORHOOD_STATUS_LABEL.bannerEvacuated
    : suspended.length > 0
      ? `${NEIGHBORHOOD_STATUS_LABEL.bannerUtility} ${suspended.join(", ")}.`
      : null;

  return (
    <div className="border-b">
      <div className="bg-accent/40 flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-semibold">
            {barrio ? barrio.name : BARRIO_PANEL.wholeCity}
          </p>
          {barrio && (
            <p className="text-muted-foreground text-xs tabular-nums">
              {barrio.comuna && `${BARRIO_PANEL.comuna(barrio.comuna)} · `}
              {sites.length === 1
                ? BARRIO_PANEL.countOne
                : BARRIO_PANEL.countMany(sites.length)}
            </p>
          )}
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
