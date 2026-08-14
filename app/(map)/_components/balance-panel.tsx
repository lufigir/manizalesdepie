"use client";

import { BarChart3, Boxes, ChevronDown, Phone } from "lucide-react";

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NeighborhoodStatusDTO } from "@/data/neighborhood/neighborhood.dto";
import type { SituationReportDTO } from "@/data/situation/situation.dto";
import {
  BARRIO_TOGGLE,
  NEIGHBORHOOD_STATUS_LABEL,
  OFFICIAL_LINES,
  SITUATION_LABEL,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { NeighborhoodStatusList } from "./neighborhood-status-list";
import { SituationCard } from "./situation-card";

/**
 * Everything that is reference rather than action, folded above the
 * section's own list instead of floating over the map.
 *
 * It used to be a button on the map that opened a sheet. The map is not
 * where you go to check something once and carry it — the panel already is,
 * and a button sitting on the map is one more thing between the reader and
 * "¿dónde ayudo hoy?". Collapsed by default for the reason the sheet also
 * started closed: on a phone the section list needs its own space, not this
 * competing for it every time the panel is in view.
 */
export function BalancePanel({
  report,
  neighborhoodStatuses = [],
  showBarrios,
  onBarriosChange,
}: {
  report?: SituationReportDTO | null;
  neighborhoodStatuses?: NeighborhoodStatusDTO[];
  showBarrios: boolean;
  onBarriosChange: (show: boolean) => void;
}) {
  return (
    <Collapsible className="data-[open]:bg-muted/30 shrink-0 border-b transition-colors">
      <CollapsibleTrigger className="group hover:bg-accent focus-visible:ring-ring flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:outline-none">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="text-muted-foreground size-4" aria-hidden />
          {SITUATION_LABEL.title}
        </span>
        <span className="flex items-center gap-2">
          {report?.affectedPeople != null && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[0.7rem] leading-none tabular-nums">
              {report.affectedPeople.toLocaleString("es-CO")}
            </span>
          )}
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180"
            aria-hidden
          />
        </span>
      </CollapsibleTrigger>

      <CollapsiblePanel>
        {/* Fixed height, not a growing max-height: this block sits above the
            section's own list inside a panel that does not scroll as a
            whole (its search box has to stay put on top of the list, see
            SiteList), so a long report gets its own scroll area instead of
            pushing the list out of view. ScrollArea's fade is what a plain
            overflow-y-auto div was missing — that cut content off with no
            sign there was more below it, which read as broken rather than
            as "scroll for more". */}
        <div className="h-48 md:h-[28rem]">
          <ScrollArea scrollFade overscrollContain className="h-full">
            <div className="flex flex-col gap-4 px-3 pb-4">
              {report ? (
                <SituationCard report={report} alwaysOpen />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay un balance vigente ahora mismo.
                </p>
              )}

              {neighborhoodStatuses.length > 0 && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {NEIGHBORHOOD_STATUS_LABEL.title}
                  </p>
                  <NeighborhoodStatusList statuses={neighborhoodStatuses} />
                </div>
              )}

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {OFFICIAL_LINES.title}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {OFFICIAL_LINES.lines.map((line) => (
                    <li key={line.number}>
                      <a
                        href={`tel:${line.dial}`}
                        className="hover:bg-accent focus-visible:ring-ring flex items-center gap-2.5 rounded-lg border p-2.5 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Phone
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold tabular-nums">
                            {line.number}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {line.what}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  {OFFICIAL_LINES.hint}
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {BARRIO_TOGGLE.title}
                </p>
                <button
                  type="button"
                  onClick={() => onBarriosChange(!showBarrios)}
                  aria-pressed={showBarrios}
                  className={cn(
                    "focus-visible:ring-ring flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    showBarrios ? "bg-accent border-primary" : "hover:bg-accent",
                  )}
                >
                  <Boxes
                    className={cn(
                      "size-4 shrink-0",
                      showBarrios ? "text-foreground" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {BARRIO_TOGGLE.label}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {BARRIO_TOGGLE.hint}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      showBarrios ? "bg-resolved" : "bg-muted",
                    )}
                  />
                </button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
