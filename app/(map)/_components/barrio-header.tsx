"use client";

import { X } from "lucide-react";

import { BARRIO_PANEL } from "@/lib/labels";

import { useWorkspace } from "./workspace-context";

/**
 * What the panel says while a barrio is being filtered by.
 *
 * It exists because a filtered list with no header is indistinguishable from a
 * city where almost nothing has been reported — and the second reading is the
 * one that makes someone close the app. The way out of the filter is here as
 * well as on the map, because on a phone the list is what the thumb is on.
 */
export function BarrioHeader() {
  const { barrio, sites, clearBarrio } = useWorkspace();

  if (!barrio) return null;

  return (
    <div className="bg-accent/40 flex items-start gap-2 border-b px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-semibold">{barrio.name}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {barrio.comuna && `${BARRIO_PANEL.comuna(barrio.comuna)} · `}
          {sites.length === 1
            ? BARRIO_PANEL.countOne
            : BARRIO_PANEL.countMany(sites.length)}
        </p>
      </div>

      <button
        type="button"
        onClick={clearBarrio}
        className="hover:bg-accent focus-visible:ring-ring flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-3" aria-hidden />
        {BARRIO_PANEL.clear}
      </button>
    </div>
  );
}
