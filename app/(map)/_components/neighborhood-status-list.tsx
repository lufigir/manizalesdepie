import { AlertTriangle } from "lucide-react";

import type {
  NeighborhoodStatusDTO,
  UtilityStatus,
} from "@/data/neighborhood/neighborhood.dto";
import { NEIGHBORHOOD_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The barrios an evacuation or a utility actually named, inside the balance
 * drawer.
 *
 * A handful of rows among 114 barrios, which is the point: this is not a
 * directory of the city, it is the short list of places where something
 * changed enough for someone to say so.
 */
export function NeighborhoodStatusList({
  statuses,
}: {
  statuses: NeighborhoodStatusDTO[];
}) {
  // Evacuated first: it is the fact that changes what someone does next: the
  // rest is read in whatever order, this one is read first.
  const sorted = [...statuses].sort((a, b) => {
    if (a.evacuated !== b.evacuated) return a.evacuated ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((status) => (
        <li
          key={status.neighborhoodId}
          className="flex flex-col gap-1 rounded-lg border p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{status.name}</span>
            {status.evacuated && (
              <span className="bg-unclaimed-surface text-unclaimed flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                <AlertTriangle className="size-3" aria-hidden />
                {NEIGHBORHOOD_STATUS_LABEL.evacuated}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <UtilityBadge
              label={NEIGHBORHOOD_STATUS_LABEL.gas}
              value={status.gasStatus}
            />
            <UtilityBadge
              label={NEIGHBORHOOD_STATUS_LABEL.power}
              value={status.powerStatus}
            />
            <UtilityBadge
              label={NEIGHBORHOOD_STATUS_LABEL.water}
              value={status.waterStatus}
            />
          </div>

          {status.notes && (
            <p className="text-muted-foreground text-[11px] leading-snug">
              {status.notes}
            </p>
          )}

          <p className="text-muted-foreground text-[10px] leading-tight">
            {status.source}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Silent on "unknown": absence of a report is not the same claim as a
 *  utility saying "normal", and a row of "sin dato" chips would drown out the
 *  one that matters. */
function UtilityBadge({
  label,
  value,
}: {
  label: string;
  value: UtilityStatus;
}) {
  if (value === "unknown") return null;

  const suspended = value === "suspended";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
        suspended ? "bg-claimed-surface text-claimed" : "bg-verified/15 text-verified",
      )}
    >
      {label} · {suspended ? NEIGHBORHOOD_STATUS_LABEL.suspended : NEIGHBORHOOD_STATUS_LABEL.normal}
    </span>
  );
}
