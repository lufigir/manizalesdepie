"use client";

import { SITE_TYPE_ICON, SITE_TYPE_LABEL, COMUNA_LABEL } from "@/lib/labels";

import type { ComunaHover } from "./comuna-layer";

/**
 * What is inside the comuna under the cursor.
 *
 * The comuna outline on its own only orients; this is what makes it worth
 * hovering. It answers the city-scale half of "¿dónde ayudo hoy?" — which part
 * of Manizales has something, and which has nothing — before the reader commits
 * to zooming anywhere.
 *
 * A comuna with zero points says so out loud rather than staying silent.
 * Emptiness here is information: it is either a gap in coverage or a gap in
 * what anyone has reported, and both are worth knowing.
 */
export function ComunaTooltip({ hover }: { hover: ComunaHover }) {
  return (
    <div
      // Positioned off the cursor so the pointer never covers the first line.
      // pointer-events-none is load-bearing: the tooltip sits over the polygon
      // it describes, and without it the hover would flicker as the cursor
      // entered the tooltip and left the feature.
      className="bg-popover text-popover-foreground pointer-events-none absolute z-20 max-w-52 -translate-y-full rounded-md border p-2 text-xs shadow-md"
      style={{ left: hover.x + 12, top: hover.y - 12 }}
      role="status"
    >
      <p className="font-semibold">{hover.name}</p>

      {hover.total === 0 ? (
        <p className="text-muted-foreground mt-0.5">{COMUNA_LABEL.empty}</p>
      ) : (
        <>
          <p className="text-muted-foreground mt-0.5 tabular-nums">
            {COMUNA_LABEL.summary(hover.total, hover.open)}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {hover.byType.map(({ type, count }) => {
              const Icon = SITE_TYPE_ICON[type];
              return (
                <li key={type} className="flex items-center gap-1.5">
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="tabular-nums">{count}</span>
                  <span className="text-muted-foreground">
                    {SITE_TYPE_LABEL[type]}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
