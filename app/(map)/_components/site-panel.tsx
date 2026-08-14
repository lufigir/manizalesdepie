"use client";

import { useMemo, useState } from "react";

import { BARRIO_PANEL, SECTION_EMPTY } from "@/lib/labels";

import { BarrioHeader } from "./barrio-header";
import { CallList } from "./call-list";
import { SiteList } from "./site-list";
import { WorkOrderList } from "./work-order-list";
import { useWorkspace } from "./workspace-context";

/**
 * The list beside the map, for the sections that are about places.
 *
 * The text filter lives here rather than in the workspace on purpose: it
 * narrows the list and never the map, so a filter cannot make a pin vanish from
 * under the reader's finger. It also resets when the section changes, which is
 * what anyone expects after switching screens.
 */
export function SitePanel({ signedIn = false }: { signedIn?: boolean }) {
  const { tab, sites, calls, workOrders, selectedId, select, barrio } =
    useWorkspace();
  const [query, setQuery] = useState("");

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((site) =>
      [site.name, site.address, site.neighborhood]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [sites, query]);

  return (
    <>
      <BarrioHeader />
      {/* Not touched by the text filter below, deliberately: that input lives
          inside the site list and belongs to it. Jornadas arrive by the handful
          and are already sorted by hour, so filtering them would be a control
          that answers a question nobody has — and one placed above the box that
          appears to drive it, which is worse than no control at all. */}
      <CallList calls={calls} selectedId={selectedId} onSelect={select} />
      <WorkOrderList workOrders={workOrders} signedIn={signedIn} />
      <SiteList
        sites={listed}
        query={query}
        onQueryChange={setQuery}
        selectedId={selectedId}
        onSelect={select}
        // Inside a barrio the empty state is about that barrio, not about the
        // city: "nobody has reported anything here yet" is a different fact
        // from "this section is empty", and only one of them is actionable.
        empty={barrio ? BARRIO_PANEL.empty : SECTION_EMPTY[tab]}
      />
    </>
  );
}
