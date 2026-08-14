"use client";

import { Boxes, Phone } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BARRIO_TOGGLE,
  NEIGHBORHOOD_STATUS_LABEL,
  OFFICIAL_LINES,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { NeighborhoodStatusList } from "./neighborhood-status-list";
import { SituationCard } from "./situation-card";
import { useWorkspace } from "./workspace-context";

/**
 * Everything that is reference rather than action: the Alcaldía's balance,
 * per-barrio status, official lines, the barrio-outline toggle.
 *
 * It used to be its own collapsible block sitting above the section's list,
 * checked once and carried while the list stayed in view underneath. Folding
 * it into the panel's own tab bar means it no longer shares the screen with
 * that list — the trade the "todo el panel lateral" redesign made on purpose,
 * for one tab system instead of a collapsible plus a stack of lists. Read
 * everything from the workspace instead of taking it as props: this renders
 * once per section (inside each section's own PanelTabs), and the balance
 * itself never changes between them.
 */
export function BalanceTab() {
  const { report, neighborhoodStatuses, showBarrios, onBarriosChange } =
    useWorkspace();

  return (
    <ScrollArea scrollFade overscrollContain className="h-full">
      <div className="flex flex-col gap-4 p-3">
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
          <p className="text-muted-foreground text-xs">{OFFICIAL_LINES.hint}</p>
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
  );
}
