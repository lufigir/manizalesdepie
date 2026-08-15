"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import type { NeighborhoodNeedDTO } from "@/data/neighborhood/neighborhood.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  FRONTS_LABEL,
  NEED_PRIORITY_LABEL,
  NEED_PRIORITY_STYLE,
  callState,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

const PRIORITY_RANK: Record<NeighborhoodNeedDTO["priority"], number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

/**
 * "Este barrio necesita X" — the dashboard behind "¿dónde ayudo hoy?".
 *
 * Reads `cityCalls`/`cityWorkOrders`, not the barrio-narrowed `calls`/
 * `workOrders`: every row here has to count against the whole city
 * regardless of which barrio the reader currently has filtered, or picking a
 * barrio on the map would zero out every other row's numbers.
 *
 * Tapping a row filters the panel to that barrio, the same mechanism a tap on
 * the map itself uses (see `selectBarrioByName`). The button below it is the
 * other half of the path this section exists for: from a declared need
 * straight to a grupo with the category and the barrio already chosen.
 */
export function FrontsList() {
  const { neighborhoodNeeds, cityCalls, cityWorkOrders, barrio, selectBarrioByName } =
    useWorkspace();

  // Narrows to whichever barrio the panel is already filtered by, same as
  // every other list here — a reader who tapped La Enea on the map should not
  // have to look at 113 other rows to find it again in this one.
  const scoped = barrio
    ? neighborhoodNeeds.filter((need) => need.name === barrio.name)
    : neighborhoodNeeds;

  if (scoped.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {FRONTS_LABEL.empty}
      </p>
    );
  }

  const sorted = [...scoped].sort((a, b) => {
    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;
    return a.name.localeCompare(b.name);
  });

  return (
    <ul className="flex flex-col gap-1.5 p-2">
      {sorted.map((need) => {
        const Icon = CALL_CATEGORY_ICON[need.category];

        const groups = cityCalls.filter(
          (call) =>
            call.neighborhood === need.name &&
            call.category === need.category &&
            callState(call) !== "ended",
        ).length;

        const cases = cityWorkOrders.filter(
          (order) =>
            order.neighborhood === need.name &&
            order.category === need.category &&
            workOrderRollup(order.status) !== "closed",
        ).length;

        const formHref = `/reportar/armar-grupo?barrio=${encodeURIComponent(need.name)}&category=${need.category}`;

        return (
          <li key={need.id} className="rounded-lg border p-2.5">
            <button
              type="button"
              onClick={() => selectBarrioByName(need.name)}
              className="focus-visible:ring-ring flex w-full items-start gap-2.5 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">
                    {CALL_CATEGORY_LABEL[need.category]} · {need.name}
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block text-[0.7rem]">
                  {cases > 0 ? FRONTS_LABEL.cases(cases) : FRONTS_LABEL.casesNone} ·{" "}
                  {groups > 0 ? FRONTS_LABEL.groupsCount(groups) : FRONTS_LABEL.groupsNone}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
                  NEED_PRIORITY_STYLE[need.priority],
                )}
              >
                {NEED_PRIORITY_LABEL[need.priority]}
              </span>
            </button>

            <div className="mt-2 flex items-center gap-1.5 pl-9.5">
              <button
                type="button"
                onClick={() => selectBarrioByName(need.name)}
                className="hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                <MapPin className="size-3" aria-hidden />
                {FRONTS_LABEL.filterBarrio}
              </button>
              <Link
                href={formHref}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold"
              >
                {FRONTS_LABEL.armHere}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
