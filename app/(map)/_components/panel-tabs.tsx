"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { PANEL_LABEL } from "@/lib/labels";

import { useWorkspace } from "./workspace-context";

export type PanelTabDef = {
  id: string;
  label: string;
  /** Shown as a badge next to the label. Omit for a tab with nothing to
   *  count (there is none today, but a tab is not required to have one). */
  count?: number;
  /** Hide the tab entirely while its count is 0, matching how CallList and
   *  WorkOrderList used to disappear rather than render an empty block. */
  hideWhenEmpty?: boolean;
  /** Whether a given selection id belongs to this tab's content — used to
   *  jump here when that id becomes selected from elsewhere (the map, a
   *  shared link). */
  matches?: (id: string) => boolean;
  content: ReactNode;
};

/**
 * The panel's tab bar, shared by all four sections.
 *
 * Balance used to be a collapsible block sitting above whatever the section
 * showed; "Ayudar" stacked three lists under it, each capped so none could
 * push the others off a phone screen. One tab system replaces both: every
 * section gets the same shape — Balance first, then its own content split
 * into as many tabs as it actually has today — and the active tab gets the
 * panel's full height instead of a fraction of it.
 *
 * `tabs[0]` is assumed to be Balance by every caller. It is not enforced
 * here because there is nothing to check it against; it only matters for
 * which tab opens by default (the first *content* tab, not Balance).
 *
 * The active tab follows the map/list selection, not just clicks: tapping a
 * pin that lives in a different tab has to reveal it, or the sync between
 * map and panel that every list already promises would quietly stop being
 * true the moment tabs got involved.
 */
export function PanelTabs({ tabs }: { tabs: PanelTabDef[] }) {
  const { selectedId, panelCollapsed, setPanelCollapsed } = useWorkspace();

  const visible = tabs.filter(
    (tab) => !tab.hideWhenEmpty || (tab.count ?? 0) > 0,
  );

  const [requested, setRequested] = useState(() => {
    const match = selectedId
      ? tabs.find((tab) => tab.matches?.(selectedId))
      : undefined;
    return match?.id ?? visible[1]?.id ?? visible[0]?.id;
  });

  // Derived at render time rather than synced back into state via an effect:
  // falls back to a tab that still exists if the requested one just emptied
  // out from under the reader (the last jornada expiring while its tab was
  // open), without a render where the stale, now-hidden tab briefly shows.
  const active = visible.some((tab) => tab.id === requested)
    ? requested
    : (visible[1]?.id ?? visible[0]?.id);

  // Read through a ref rather than depending on `tabs` directly: the array is
  // a fresh literal every render (built inline by each section's panel), so
  // depending on it would re-run this on every unrelated re-render and drag
  // the reader back to the selection's tab even after they switched away by
  // hand. Only an actual change in `selectedId` should do that. Written in
  // its own effect (not during render) so a render that never commits can't
  // leave it holding a `tabs` array nothing else agrees with.
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  });

  useEffect(() => {
    if (!selectedId) return;
    const match = tabsRef.current.find((tab) => tab.matches?.(selectedId));
    if (match) setRequested(match.id);
  }, [selectedId]);

  if (visible.length === 0) return null;

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setRequested(value as string)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="flex shrink-0 items-center gap-1 border-b p-1.5">
        {/* Up to four tabs share a strip as narrow as 320px on desktop — the
            default tab padding/text-size was sized for two or three wide.
            Scrolls (no-scrollbar) rather than wraps if it still overflows on
            a very cramped width, same escape hatch the top TabBar already
            relies on. */}
        <TabsList className="no-scrollbar flex-1 justify-start gap-0 overflow-x-auto p-0">
          {visible.map((tab) => (
            <TabsTab
              key={tab.id}
              value={tab.id}
              className="h-8 gap-1 px-1.5 text-xs sm:h-8 sm:text-xs"
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-muted-foreground/15 rounded-full px-1.5 py-0.5 text-[0.6rem] leading-none tabular-nums">
                  {tab.count}
                </span>
              )}
            </TabsTab>
          ))}
        </TabsList>

        {/* Mobile only: on desktop the panel sits beside a map with room to
            spare, and there is nowhere for this to free up. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="md:hidden"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          aria-label={panelCollapsed ? PANEL_LABEL.expand : PANEL_LABEL.collapse}
          aria-expanded={!panelCollapsed}
        >
          {panelCollapsed ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      {/* Collapsed on mobile means MapWorkspace has already shrunk the aside
          to this header's height; not rendering the panels avoids a clipped,
          still-scrollable list sitting invisibly underneath it. */}
      {!panelCollapsed &&
        visible.map((tab) => (
          <TabsPanel
            key={tab.id}
            value={tab.id}
            className="flex min-h-0 flex-1 flex-col"
          >
            {tab.content}
          </TabsPanel>
        ))}
    </Tabs>
  );
}
