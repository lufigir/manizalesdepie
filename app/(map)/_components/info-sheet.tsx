"use client";

import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SituationReportDTO } from "@/data/situation/situation.dto";
import {
  CONTEXT_LAYERS,
  LAYER_LABEL,
  type ContextLayer,
} from "@/lib/layers";
import { SITUATION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { SituationCard } from "./situation-card";

/**
 * Everything that is reference rather than action, behind one button.
 *
 * The city balance used to float over the map as a card. Even collapsed it took
 * the top-left corner, and on a phone that corner is a quarter of the map. It
 * is also not something anyone consults every few seconds — it is context you
 * check once and carry. That belongs in a drawer.
 *
 * The context layer toggles moved in with it for the same reason: they are set
 * once and left alone, unlike the action layer, which is the actual steering
 * wheel and stays on the map.
 */
export function InfoSheet({
  report,
  context,
  onContextToggle,
}: {
  report?: SituationReportDTO | null;
  context: Set<ContextLayer>;
  onContextToggle: (layer: ContextLayer) => void;
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

          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {LAYER_LABEL.contextTitle}
            </p>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(CONTEXT_LAYERS) as ContextLayer[]).map((layer) => {
                const { label, hint, icon: Icon } = CONTEXT_LAYERS[layer];
                const on = context.has(layer);

                return (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => onContextToggle(layer)}
                    aria-pressed={on}
                    className={cn(
                      "focus-visible:ring-ring flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      on ? "bg-accent border-primary" : "hover:bg-accent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        on ? "text-foreground" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {hint}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        on ? "bg-resolved" : "bg-muted",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetPopup>
    </Sheet>
  );
}
