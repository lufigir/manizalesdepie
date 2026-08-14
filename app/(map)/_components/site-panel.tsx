"use client";

import { useMemo, useState } from "react";

import {
  BARRIO_PANEL,
  CALL_LABEL,
  PANEL_LABEL,
  SECTION_EMPTY,
  WORK_ORDER_LABEL,
} from "@/lib/labels";

import { BalanceTab } from "./balance-tab";
import { BarrioHeader } from "./barrio-header";
import { CallList } from "./call-list";
import { PanelTabs, type PanelTabDef } from "./panel-tabs";
import { SiteList } from "./site-list";
import { WorkOrderList } from "./work-order-list";
import { useWorkspace } from "./workspace-context";

/**
 * The panel beside the map, for the sections that are about places: Balance,
 * Jornadas, Escombros and Sitios, each its own tab (see PanelTabs). Jornadas
 * and Escombros are empty and hidden outside "Ayudar" — "Necesito" only ever
 * shows Balance and Sitios.
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

  const tabs: PanelTabDef[] = [
    { id: "balance", label: PANEL_LABEL.balance, content: <BalanceTab /> },
    // Not touched by the text filter above SiteList, deliberately: jornadas
    // arrive by the handful and are already sorted by hour, so filtering
    // them would be a control that answers a question nobody has.
    {
      id: "calls",
      label: CALL_LABEL.heading,
      count: calls.length,
      hideWhenEmpty: true,
      matches: (id) => calls.some((call) => call.id === id),
      content: <CallList calls={calls} selectedId={selectedId} onSelect={select} />,
    },
    {
      id: "workOrders",
      label: WORK_ORDER_LABEL.heading,
      count: workOrders.length,
      hideWhenEmpty: true,
      matches: (id) => workOrders.some((order) => order.id === id),
      content: <WorkOrderList workOrders={workOrders} signedIn={signedIn} />,
    },
    {
      id: "sites",
      label: PANEL_LABEL.sites,
      count: listed.length,
      matches: (id) => sites.some((site) => site.id === id),
      content: (
        <SiteList
          sites={listed}
          query={query}
          onQueryChange={setQuery}
          selectedId={selectedId}
          onSelect={select}
          // Inside a barrio the empty state is about that barrio, not about
          // the city: "nobody has reported anything here yet" is a different
          // fact from "this section is empty", and only one is actionable.
          empty={barrio ? BARRIO_PANEL.empty : SECTION_EMPTY[tab]}
        />
      ),
    },
  ];

  return (
    <>
      <BarrioHeader />
      <PanelTabs tabs={tabs} />
    </>
  );
}
