"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Map, MapControls, MapPopup } from "@/components/ui/map";

import type { SiteDTO, SiteStatus } from "@/data/site/site.dto";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type {
  NeighborhoodNeedDTO,
  NeighborhoodStatusDTO,
} from "@/data/neighborhood/neighborhood.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import { BARRIO_PANEL, PANEL_LABEL } from "@/lib/labels";
import {
  ALL_REPORT_ENTRIES,
  CHIP_PRIMARY_ACTION,
  CHIP_REPORT_MENU,
  SITE_TYPE_TAB,
  initialChipForTab,
  tabFromSegment,
  type PanelChip,
  type TabId,
} from "@/lib/tabs";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { BarrioLayer, type BarrioProps } from "./barrio-layer";
import { CallMarkers } from "./call-markers";
import { CallPopup } from "./call-popup";
import { LiveClock } from "./live-clock";
import { FitToSites, FlyToSelected } from "./map-camera";
import { ReportMenu } from "./report-menu";
import { ResourceOfferMarkers } from "./resource-offer-markers";
import { SightingMarkers } from "./sighting-markers";
import { WorkOrderItem } from "./work-order-list";
import { WorkOrderMarkers } from "./work-order-markers";
import { SiteMarkers } from "./site-markers";
import { SitePopup } from "./site-popup";
import { UnifiedPanel } from "./unified-panel";
import { WorkspaceContext } from "./workspace-context";

/** Manizales sits on a ridge running east–west. Only the starting frame before
 *  FitToSites takes over; it holds the city and Villamaría across the river. */
const MANIZALES = { longitude: -75.5074, latitude: 5.0631, zoom: 12.4 };

/**
 * Where the emergency is. Nothing this app knows about exists outside it.
 *
 * The box is the bounding box of all 114 barrios (`public/barrios.geojson`)
 * plus roughly 4.5 km of margin on every side — enough that panning still
 * feels free rather than hitting a wall, but not so loose that someone can
 * scroll all the way out to another department. Villamaría's own point
 * (-75.512, 5.045) already falls inside the barrios' bbox, so the margin is
 * there for breathing room, not to reach across the river.
 */
const CITY_BOUNDS: [[number, number], [number, number]] = [
  [-75.592, 4.983],
  [-75.382, 5.144],
];

type Props = {
  sites: SiteDTO[];
  /** Grupos. */
  calls?: CallDTO[];
  /** Animal reports. Not sites: they mostly have no location at all. */
  animals?: AnimalDTO[];
  /** Resource offers — a truck, a warehouse, a spare room. Pinned at the
   *  barrio's own centroid when they carry a point. */
  resourceOffers?: ResourceOfferDTO[];
  /** Individual household requests — "Necesidades". */
  workOrders?: WorkOrderDTO[];
  /** Every barrio with an evacuation/utility status on record. */
  neighborhoodStatuses?: NeighborhoodStatusDTO[];
  /** Every frente on record — "este barrio necesita X". Curated by hand, see
   *  `neighborhood_need`. Not shown as its own chip yet — see `PanelChip`. */
  neighborhoodNeeds?: NeighborhoodNeedDTO[];
  /** Set when arriving from a shared link. The map opens already centred on
   *  that pin with its card up, because the question the link was sent to
   *  answer is "¿por dónde queda exactamente?" and it should be answered
   *  before anyone touches anything. */
  initialSelectedId?: string;
  /** Seeds which chip the panel opens on (see `initialChipForTab`). The tab
   *  layout leaves this off and lets the active route segment decide;
   *  `/punto/[id]` sets it explicitly, because there the section is a
   *  property of the pin that was shared. Only a seed — the reader can still
   *  pick a different chip afterwards. */
  tab?: TabId;
  /** Extra content rendered above the panel — today only `/grupo/[id]`'s
   *  attendee list, which is not part of any family and does not belong
   *  inside `UnifiedPanel`. */
  children?: React.ReactNode;
};

/**
 * The map, the (now icon-only) quick-jump row, and the one panel that
 * carries all the actual filtering.
 *
 * Every family draws on the map unconditionally now — sites, grupos, casos,
 * located animal sightings, located resource offers — nothing is hidden for
 * belonging to the "wrong" section. What changed hands to `UnifiedPanel` is
 * the filtering itself: its own row of chips (Todo, Grupos, Necesidades,
 * Sitios, Mascotas, Servicios) is the one control surface for what the panel
 * lists, and it never gates the map. `activeChip` is that state, shared
 * through the workspace context so `UnifiedPanel` can read and change it and
 * this component's own primary button can jump straight to one.
 */
export function MapWorkspace({
  sites,
  calls = [],
  animals = [],
  resourceOffers = [],
  workOrders = [],
  neighborhoodStatuses = [],
  neighborhoodNeeds = [],
  initialSelectedId,
  tab: forcedTab,
  children,
}: Props) {
  // In the tab layout this is the active child route; on a shared-pin page
  // there is no such child, so the caller passes the section explicitly.
  const segment = useSelectedLayoutSegment();

  const [activeChip, setActiveChip] = useState<PanelChip>(() =>
    initialChipForTab(forcedTab ?? tabFromSegment(segment)),
  );

  // Only fires on a REAL route change (a pasted `/mascotas` link, the back
  // button) — chip clicks never touch `segment`, so this never fights a
  // reader's own selection. `segment` is an external signal (the router), so
  // syncing state from it is exactly the escape hatch this lint rule leaves
  // open — see the same justification on the effect in `useDraft`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveChip(initialChipForTab(forcedTab ?? tabFromSegment(segment)));
  }, [segment, forcedTab]);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  // Which barrio the map is centred on. Zoomed in you are inside one, its
  // outline is off-screen and the wash is invisible, so the layer looks dead
  // even though it is working. This says where you are without a cursor —
  // which also makes it the only version of this that exists on a phone.
  const [centreBarrio, setCentreBarrio] = useState<string | null>(null);
  // The barrio being filtered by, set by tapping one on the map. Null is the
  // whole city, which is where everyone starts.
  const [barrio, setBarrio] = useState<BarrioProps | null>(null);
  // Mobile only: shrinks the panel to just its header so the map can take
  // the freed space.
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const liveStatus = useLiveSiteStatus();

  const withLiveStatus = useMemo(
    () =>
      sites.map((site) => ({
        ...site,
        status: liveStatus[site.id] ?? site.status,
      })),
    [sites, liveStatus],
  );

  /** Every site the map ever draws — the ones mapped to `null` in
   *  `SITE_TYPE_TAB` still never appear, because they are still not part of
   *  any question this app answers. No filtering beyond that: the map is
   *  unconditional now, the panel does the narrowing. */
  const mapSites = useMemo(
    () => withLiveStatus.filter((site) => SITE_TYPE_TAB[site.type] !== null),
    [withLiveStatus],
  );

  /**
   * The panel narrows to the chosen barrio; the map never does.
   *
   * Hiding pins outside the barrio was wrong: the map is how you find out that
   * the nearest acopio is one barrio over, and a map that hides it answers
   * "¿dónde ayudo hoy?" with less than it knows. Selecting a barrio flies the
   * camera to it — that is the focus — and the panel does the filtering.
   */
  const panelSites = useMemo(
    () =>
      barrio ? mapSites.filter((site) => site.neighborhood === barrio.name) : mapSites,
    [mapSites, barrio],
  );

  const panelCalls = useMemo(
    () =>
      barrio ? calls.filter((call) => call.neighborhood === barrio.name) : calls,
    [calls, barrio],
  );

  const panelWorkOrders = useMemo(
    () =>
      barrio
        ? workOrders.filter((order) => order.neighborhood === barrio.name)
        : workOrders,
    [workOrders, barrio],
  );

  /** Offers carry a `neighborhood`, even though the point behind it is a
   *  barrio-level fact rather than an exact corner — narrowing by it is
   *  still meaningful, unlike for animals (see `animals` below, unfiltered). */
  const panelResourceOffers = useMemo(
    () =>
      barrio
        ? resourceOffers.filter((offer) => offer.neighborhood === barrio.name)
        : resourceOffers,
    [resourceOffers, barrio],
  );

  /**
   * One selection, two kinds of thing with a popup. Animal and offer pins
   * can still be selected — they just have no card of their own yet, so
   * selecting one only highlights its marker and scrolls the panel.
   */
  const selected = withLiveStatus.find((site) => site.id === selectedId) ?? null;
  const selectedCall = calls.find((call) => call.id === selectedId) ?? null;
  const selectedOrder = workOrders.find((order) => order.id === selectedId) ?? null;

  /**
   * Some chips are not about places at all.
   *
   * A lost animal has no location — that is what lost means — and a service
   * moves by definition. For those the panel is the product and the map shrinks
   * to a zone reference, rather than the other way round.
   */
  const panelLeads = activeChip === "pets" || activeChip === "services";

  const primaryAction = CHIP_PRIMARY_ACTION[activeChip];
  const reportEntries =
    activeChip === "all" ? ALL_REPORT_ENTRIES : (CHIP_REPORT_MENU[activeChip] ?? []);

  const barrioStatus = useMemo(
    () =>
      barrio
        ? (neighborhoodStatuses.find((s) => s.name === barrio.name) ?? null)
        : null,
    [neighborhoodStatuses, barrio],
  );

  const workspace = useMemo(
    () => ({
      activeChip,
      setActiveChip,
      // The panel's lists, narrowed to the barrio. The map draws the full,
      // unfiltered sets above instead.
      sites: panelSites,
      calls: panelCalls,
      animals,
      resourceOffers: panelResourceOffers,
      workOrders: panelWorkOrders,
      // Same two lists, city-wide — what FrontsList counts against, since a
      // barrio being filtered by must not hide every other barrio's numbers.
      cityCalls: calls,
      cityWorkOrders: workOrders,
      neighborhoodNeeds,
      selectedId,
      select: setSelectedId,
      barrio,
      clearBarrio: () => setBarrio(null),
      selectBarrioByName: (name: string) =>
        setBarrio({ id: name, name, comuna: null, lon: 0, lat: 0 }),
      barrioStatus,
      neighborhoodStatuses,
      panelCollapsed,
      setPanelCollapsed,
    }),
    [
      activeChip,
      panelSites,
      panelCalls,
      animals,
      panelResourceOffers,
      panelWorkOrders,
      calls,
      workOrders,
      neighborhoodNeeds,
      selectedId,
      barrio,
      barrioStatus,
      neighborhoodStatuses,
      panelCollapsed,
    ],
  );

  return (
    <WorkspaceContext value={workspace}>
      {/* Stacked (map on top, panel below) until `lg` (1024px), not `md`
          (768px) — a portrait tablet sits right at 768–834px, and with six
          filter chips plus a search box the panel now carries enough that
          splitting it beside the map at that width left neither one with
          room to breathe. Full-width stacked reads far better there; true
          side-by-side waits for a screen wide enough that both halves still
          have space once split. */}
      <div className="flex h-full w-full flex-col lg:flex-row">
        <div
          className={cn(
            "relative min-h-0 transition-[flex-grow] duration-300",
            // Non-panelLeads chips are always flex-1 already, narrow and
            // wide alike — the aside next to it carries a fixed height, so
            // shrinking that height (collapsed) already hands this the freed
            // space with no extra class needed here.
            //
            // panelLeads chips invert that today (map fixed, aside grows)
            // because the panel is the product there. Collapsing has to
            // invert it back below `lg`: the map takes the freed space
            // instead — but only there: lg: always restores the normal 38%
            // share, since there is room to spare there and the toggle that
            // sets `panelCollapsed` is hidden at that breakpoint.
            panelLeads
              ? cn(
                  panelCollapsed ? "flex-1" : "h-[32dvh]",
                  "lg:h-auto lg:flex-[0_0_38%]",
                )
              : "flex-1",
          )}
        >
          <Map
            className="h-full w-full"
            center={[MANIZALES.longitude, MANIZALES.latitude]}
            zoom={MANIZALES.zoom}
            maxBounds={CITY_BOUNDS}
          >
            {/* Bottom-right because the clock holds the top-right corner.
                showLocate is the one that earns its place: "¿dónde ayudo hoy?"
                is answered best by "aquí, a 300 metros". */}
            <MapControls
              position="bottom-right"
              showZoom
              showLocate
              showCompass
              showFullscreen
            />
            <BarrioLayer
              onCentreChange={setCentreBarrio}
              selected={barrio?.name ?? null}
              onSelect={setBarrio}
              statuses={neighborhoodStatuses}
            />
            {/* Framed over everything the map can ever draw, once, on load. */}
            <FitToSites
              sites={[
                ...mapSites,
                ...calls,
                ...workOrders,
                ...animals.filter(
                  (a): a is AnimalDTO & { longitude: number; latitude: number } =>
                    a.longitude !== null && a.latitude !== null,
                ),
                ...resourceOffers.filter(
                  (o): o is ResourceOfferDTO & { longitude: number; latitude: number } =>
                    o.longitude !== null && o.latitude !== null,
                ),
              ]}
            />
            <FlyToSelected site={selected ?? selectedCall ?? selectedOrder} />

            <SiteMarkers sites={mapSites} selectedId={selectedId} onSelect={setSelectedId} />

            <CallMarkers calls={calls} selectedId={selectedId} onSelect={setSelectedId} />

            <WorkOrderMarkers
              workOrders={workOrders}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <SightingMarkers
              animals={animals}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <ResourceOfferMarkers
              resourceOffers={resourceOffers}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {/* Anchored to the pin rather than sliding over the map, so the
                answer and its place on the map stay on screen together.
                Rendered from state instead of MarkerPopup's built-in click
                toggle, because a shared link has to open it without a click.

                closeOnClick=false so panning the map does not dismiss the card
                mid-read; focusAfterOpen=false so the popup does not steal focus
                and jump the page on a phone. */}
            {selected && (
              <MapPopup
                longitude={selected.longitude}
                latitude={selected.latitude}
                onClose={() => setSelectedId(null)}
                closeButton
                closeOnClick={false}
                focusAfterOpen={false}
                offset={22}
                className="max-h-[58dvh] w-[min(20rem,calc(100vw-2.5rem))] max-w-none overflow-y-auto"
              >
                <SitePopup site={selected} />
              </MapPopup>
            )}

            {selectedCall && (
              <MapPopup
                longitude={selectedCall.longitude}
                latitude={selectedCall.latitude}
                onClose={() => setSelectedId(null)}
                closeButton
                closeOnClick={false}
                focusAfterOpen={false}
                offset={22}
                className="max-h-[58dvh] w-[min(20rem,calc(100vw-2.5rem))] max-w-none overflow-y-auto"
              >
                <CallPopup call={selectedCall} />
              </MapPopup>
            )}

            {/* No dedicated WorkOrderPopup: the card is the same one the
                panel already draws for "Necesidades", claim/close buttons
                included — a case's whole detail is that card, so a second
                component that only reformats it would drift from it over
                time. */}
            {selectedOrder && (
              <MapPopup
                longitude={selectedOrder.longitude}
                latitude={selectedOrder.latitude}
                onClose={() => setSelectedId(null)}
                closeButton
                closeOnClick={false}
                focusAfterOpen={false}
                offset={22}
                className="max-h-[58dvh] w-[min(20rem,calc(100vw-2.5rem))] max-w-none overflow-y-auto"
              >
                <WorkOrderItem order={selectedOrder} />
              </MapPopup>
            )}
          </Map>

          {/* Only the clock and the barrio chip live up here now. The old
              section switcher (Todo/Ayudar/Necesito/Mascotas/Servicios) was
              removed rather than shrunk further: every one of its five
              actions was already reachable through `UnifiedPanel`'s own row
              of chips — four mapped it 1:1, and "Ayudar" landed on the exact
              same "Todo" chip the panel's own Todo button already opens — so
              it was a second control surface for something the panel already
              did, not a distinct capability. The four routes still exist and
              still seed which chip a fresh visit opens on (see
              `initialChipForTab`); they just have no button of their own to
              click while already inside the app. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end gap-2 p-2 sm:p-3">
            <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
              {/* Hidden below `lg`: the clock is reassurance ("this is
                  live"), not a control, and on a narrower screen the barrio
                  chip below it matters more. */}
              <div className="hidden lg:block">
                <LiveClock />
              </div>
                {/* One slot, two states. While a barrio is filtered the chip
                    IS the filter and carries the way out of it; otherwise it
                    just says where the map is centred. Two chips stacked said
                    the same word twice and neither looked like a control. */}
                {barrio ? (
                  <button
                    type="button"
                    onClick={() => setBarrio(null)}
                    className="bg-primary text-primary-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {barrio.name}
                    <X className="size-3" strokeWidth={3} aria-hidden />
                    <span className="sr-only">{BARRIO_PANEL.clear}</span>
                  </button>
                ) : (
                  centreBarrio && (
                    <span className="bg-background/90 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium shadow-sm backdrop-blur">
                      {centreBarrio}
                    </span>
                  )
                )}
            </div>
          </div>

          {/* Bottom-left: the thumb's reach on a phone, and clear of the map
              controls on the right. "Todo" has no one obvious next step the
              way a single chip does, so it gets only the "+" — every form in
              the app, none of them promoted above the rest. */}
          {(primaryAction || reportEntries.length > 0) && (
            <div className="absolute bottom-4 left-2 z-10 flex flex-col items-start gap-2">
              <ReportMenu entries={reportEntries} barrio={barrio?.name ?? null} />

              {primaryAction && (
                <Link
                  // The barrio being looked at travels to the form, which opens
                  // with it already chosen and its map already framed there.
                  // In the URL rather than in state: the form is another route,
                  // and this way the link survives a reload and can be pasted.
                  href={
                    barrio
                      ? `${primaryAction.href}?barrio=${encodeURIComponent(barrio.name)}`
                      : primaryAction.href
                  }
                  className="bg-primary text-primary-foreground focus-visible:ring-ring flex items-center gap-2 rounded-full py-3 pr-4 pl-3.5 text-sm font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                  <primaryAction.icon className="size-4" strokeWidth={2.5} aria-hidden />
                  {primaryAction.label}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Below the map until `lg`, beside it from there. Which of the two
            gets the space depends on the chip: for places the map is the
            product, for animals and services the panel is. */}
        <aside
          className={cn(
            "bg-background flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l",
            panelCollapsed
              ? cn(
                  "h-12 shrink-0 overflow-hidden",
                  panelLeads
                    ? "lg:h-auto lg:flex-1 lg:overflow-y-auto"
                    : "lg:h-auto lg:w-96 xl:w-[26rem]",
                )
              : panelLeads
                ? "flex-1 overflow-y-auto"
                : "h-[38dvh] shrink-0 lg:h-auto lg:w-96 xl:w-[26rem]",
          )}
        >
          {/* Only below `lg`: from there the panel sits beside a map with
              room to spare, and there is nowhere for this to free up. Its
              own small header rather than folded into BarrioHeader, because
              collapsing has to work identically whichever chip is active,
              including the two ("pets", "services") that render their own
              board instead of a list. */}
          <div className="flex shrink-0 items-center justify-end border-b p-1 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
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

          {/* Collapsed on mobile means the aside has already shrunk to just
              the header above; not rendering the content avoids a clipped,
              still-scrollable panel sitting invisibly underneath it. */}
          {!panelCollapsed && (
            <div className="flex min-h-0 flex-1 flex-col">
              {children}
              <UnifiedPanel />
            </div>
          )}
        </aside>
      </div>
    </WorkspaceContext>
  );
}

/**
 * Only the field that actually churns rides the live channel: whether a place
 * is open, full or closed. Names, addresses and item lists are served cached
 * from the server render, because they barely move and a socket per row would
 * cost battery for nothing.
 */
function useLiveSiteStatus() {
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({});

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("site-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site" },
        (payload) => {
          const row = payload.new as { id?: string; status?: SiteStatus };
          if (!row.id || !row.status) return;
          setStatuses((prev) => ({ ...prev, [row.id!]: row.status! }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return statuses;
}
