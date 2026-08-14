"use client";

import { BarChart3, Boxes, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
 * Everything that is reference rather than action, behind one button.
 *
 * The city balance used to float over the map as a card. Even collapsed it took
 * the top-left corner, and on a phone that corner is a quarter of the map. It
 * is also not something anyone consults every few seconds — it is context you
 * check once and carry. That belongs in a drawer.
 *
 * The barrio toggle moved in with it for the same reason: it is set once and
 * left alone, unlike the section switcher, which is the actual steering wheel
 * and stays on the map.
 */
export function InfoSheet({
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
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="bg-background/90 backdrop-blur"
          />
        }
      >
        <BarChart3 className="size-4" aria-hidden />
        {/* The headline number rides on the button itself, so the one figure
            worth interrupting for needs no tap at all. */}
        {report?.affectedPeople != null && (
          <span className="tabular-nums">
            {report.affectedPeople.toLocaleString("es-CO")}
          </span>
        )}
        <span className="sr-only sm:not-sr-only">
          {SITUATION_LABEL.affected}
        </span>
      </SheetTrigger>

      <SheetPopup side="left" className="w-[min(22rem,92vw)]">
        <SheetHeader>
          <SheetTitle>{SITUATION_LABEL.title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
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
      </SheetPopup>
    </Sheet>
  );
}
