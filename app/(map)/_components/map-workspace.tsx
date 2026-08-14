"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { X } from "lucide-react";

import { Map, MapControls, MapPopup } from "@/components/ui/map";

import type { SiteDTO, SiteStatus } from "@/data/site/site.dto";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type { NeighborhoodStatusDTO } from "@/data/neighborhood/neighborhood.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { SituationReportDTO } from "@/data/situation/situation.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import { BARRIO_TOGGLE } from "@/lib/labels";
import {
  REPORT_ENTRY,
  SITE_TYPE_TAB,
  tabFromSegment,
  type TabId,
} from "@/lib/tabs";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { BalancePanel } from "./balance-panel";
import { BarrioLayer, type BarrioProps } from "./barrio-layer";
import { CallMarkers } from "./call-markers";
import { CallPopup } from "./call-popup";
import { LiveClock } from "./live-clock";
import { FitToSites, FlyToSelected } from "./map-camera";
import { SightingMarkers } from "./sighting-markers";
import { SiteMarkers } from "./site-markers";
import { SitePopup } from "./site-popup";
import { TabBar } from "./tab-bar";
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
  /** Jornadas. Places with an hour attached, drawn only in "Ayudar". */
  calls?: CallDTO[];
  /** Animal reports. Not sites: they mostly have no location at all. */
  animals?: AnimalDTO[];
  /** Resource offers. Cards in "Servicios", never pins — see
   *  workspace-context.ts. */
  resourceOffers?: ResourceOfferDTO[];
  /** Debris and damage reports, shown in "Ayudar". */
  workOrders?: WorkOrderDTO[];
  /** The Alcaldía's latest balance, or null once it has expired. */
  report?: SituationReportDTO | null;
  /** Every barrio with an evacuation/utility status on record. */
  neighborhoodStatuses?: NeighborhoodStatusDTO[];
  /** Set when arriving from a shared link. The map opens already centred on
   *  that pin with its card up, because the question the link was sent to
   *  answer is "¿por dónde queda exactamente?" and it should be answered
   *  before anyone touches anything. */
  initialSelectedId?: string;
  /** Forces the active section. The tab layout leaves this off and lets the
   *  active route segment decide; `/punto/[id]` sets it, because there the
   *  section is a property of the pin that was shared. */
  tab?: TabId;
  /** The section's own screen: a list, a photo board, a set of cards. */
  children: React.ReactNode;
};

/**
 * The map, the section switcher and whatever panel the active section renders.
 *
 * Everything persistent lives here and everything section-specific arrives as
 * `children`, which is what lets the reader move between "Ayudar" and
 * "Mascotas" without the map being torn down and rebuilt underneath them.
 */
export function MapWorkspace({
  sites,
  calls = [],
  animals = [],
  resourceOffers = [],
  workOrders = [],
  report,
  neighborhoodStatuses = [],
  initialSelectedId,
  tab: forcedTab,
  children,
}: Props) {
  // In the tab layout this is the active child route; on a shared-pin page
  // there is no such child, so the caller passes the section explicitly.
  const segment = useSelectedLayoutSegment();
  const tab = forcedTab ?? tabFromSegment(segment);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  // The only context layer left after the move to sections. It stays a toggle
  // rather than a section because it answers a different question at the same
  // time as whatever is on screen: which barrio am I looking at.
  const [showBarrios, setShowBarrios] = useState(true);
  // Which barrio the map is centred on. Zoomed in you are inside one, its
  // outline is off-screen and the wash is invisible, so the layer looks dead
  // even though it is working. This says where you are without a cursor —
  // which also makes it the only version of this that exists on a phone.
  const [centreBarrio, setCentreBarrio] = useState<string | null>(null);
  // The barrio being filtered by, set by tapping one on the map. Null is the
  // whole city, which is where everyone starts.
  const [barrio, setBarrio] = useState<BarrioProps | null>(null);

  const liveStatus = useLiveSiteStatus();

  const withLiveStatus = useMemo(
    () =>
      sites.map((site) => ({
        ...site,
        status: liveStatus[site.id] ?? site.status,
      })),
    [sites, liveStatus],
  );

  /**
   * What is drawn: the sites that belong to the active section, and nothing
   * else. Types mapped to `null` are drawn nowhere — they are still valid rows,
   * they just are not part of any question this app answers.
   */
  const visible = useMemo(
    () => withLiveStatus.filter((site) => SITE_TYPE_TAB[site.type] === tab),
    [withLiveStatus, tab],
  );

  /**
   * Jornadas belong to exactly one section, so there is nothing to map: they
   * are drawn in "Ayudar" and nowhere else. A shift is a way of giving time,
   * which is the question that section answers.
   */
  const visibleCalls = useMemo(
    () => (tab === "help" ? calls : []),
    [calls, tab],
  );

  /** Debris and damage reports: same rule as a jornada — read in "Ayudar",
   *  nowhere else, because "las necesidades se ven en Ayudar" applies here
   *  too. */
  const visibleWorkOrders = useMemo(
    () => (tab === "help" ? workOrders : []),
    [workOrders, tab],
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
      barrio
        ? visible.filter((site) => site.neighborhood === barrio.name)
        : visible,
    [visible, barrio],
  );

  const panelCalls = useMemo(
    () =>
      barrio
        ? visibleCalls.filter((call) => call.neighborhood === barrio.name)
        : visibleCalls,
    [visibleCalls, barrio],
  );

  const panelWorkOrders = useMemo(
    () =>
      barrio
        ? visibleWorkOrders.filter((order) => order.neighborhood === barrio.name)
        : visibleWorkOrders,
    [visibleWorkOrders, barrio],
  );

  /**
   * Per-section counts, so an empty section is visible before it is opened.
   * City-wide, matching the map: the pins for every barrio stay drawn, so a
   * number that counted only the selected barrio would contradict what is on
   * screen. The barrio's own count lives in the panel header, where it belongs.
   */
  const counts = useMemo(() => {
    const base: Record<TabId, number> = {
      help: 0,
      need: 0,
      pets: 0,
      services: 0,
    };
    for (const site of withLiveStatus) {
      const target = SITE_TYPE_TAB[site.type];
      if (target) base[target] += 1;
    }
    // Jornadas count towards "Ayudar" alongside the places. The number says how
    // much is on that map, and a shift is on it.
    base.help += calls.length;
    // Only the animals still missing: a reunited pet is good news, not an open
    // case.
    base.pets = animals.filter((a) => a.resolvedAt === null).length;
    base.services = resourceOffers.length;
    return base;
  }, [withLiveStatus, animals, calls, resourceOffers]);

  /**
   * One selection, two kinds of thing. Ids are uuids from different tables, so
   * at most one of these resolves and whichever does decides which card opens —
   * no discriminator to keep in step, and no way for both to be open at once.
   */
  const selected = withLiveStatus.find((site) => site.id === selectedId) ?? null;
  const selectedCall = visibleCalls.find((call) => call.id === selectedId) ?? null;

  /**
   * Some sections are not about places at all.
   *
   * A lost animal has no location — that is what lost means — and a service
   * moves by definition. For those the panel is the product and the map shrinks
   * to a zone reference, rather than the other way round.
   */
  const panelLeads = tab === "pets" || tab === "services";

  const reportEntries = REPORT_ENTRY[tab];

  const barrioStatus = useMemo(
    () =>
      barrio
        ? (neighborhoodStatuses.find((s) => s.name === barrio.name) ?? null)
        : null,
    [neighborhoodStatuses, barrio],
  );

  const workspace = useMemo(
    () => ({
      tab,
      // The panel's lists, narrowed to the barrio. The map draws `visible`.
      sites: panelSites,
      calls: panelCalls,
      animals,
      resourceOffers,
      workOrders: panelWorkOrders,
      selectedId,
      select: setSelectedId,
      barrio,
      clearBarrio: () => setBarrio(null),
      barrioStatus,
    }),
    [
      tab,
      panelSites,
      panelCalls,
      animals,
      resourceOffers,
      panelWorkOrders,
      selectedId,
      barrio,
      barrioStatus,
    ],
  );

  return (
    <WorkspaceContext value={workspace}>
      <div className="flex h-full w-full flex-col md:flex-row">
        <div
          className={cn(
            "relative min-h-0 transition-[flex-grow] duration-300",
            panelLeads ? "h-[32dvh] md:h-auto md:flex-[0_0_38%]" : "flex-1",
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
            {showBarrios && (
              <BarrioLayer
                onCentreChange={setCentreBarrio}
                selected={barrio?.name ?? null}
                onSelect={setBarrio}
                statuses={neighborhoodStatuses}
              />
            )}
            {/* Framed over both, so a jornada convened on the edge of the city
                is not left outside the opening view of the map that draws it. */}
            <FitToSites sites={[...visible, ...visibleCalls]} />
            <FlyToSelected site={selected ?? selectedCall} />

            <SiteMarkers
              sites={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <CallMarkers
              calls={visibleCalls}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {tab === "pets" && (
              <SightingMarkers
                animals={animals}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}

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
          </Map>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 p-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2 sm:p-3">
            <div className="pointer-events-auto min-w-0 sm:max-w-[calc(100vw-24rem)]">
              <TabBar active={tab} counts={counts} />
            </div>

            {/* Reference belongs away from the section switcher: the tabs steer
                the app, while the clock is context checked between actions.
                The balance moved into the panel (BalancePanel) — it is
                something you check once and carry, not a control that
                belongs on the map. */}
            <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5 self-end sm:self-auto">
              <LiveClock />
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
                    <span className="sr-only">{BARRIO_TOGGLE.clear}</span>
                  </button>
                ) : (
                  showBarrios &&
                  centreBarrio && (
                    <span className="bg-background/90 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium shadow-sm backdrop-blur">
                      {centreBarrio}
                    </span>
                  )
                )}
            </div>
          </div>

          {/* Bottom-left: the thumb's reach on a phone, and clear of the map
              controls on the right. This is the only write path the city has,
              and it points at the active section's own forms — "reportar" means
              something different in each one. Services has no entity yet, so
              there is nothing to point at and nothing is drawn.

              "Ayudar" has two, stacked. The first declared is the filled one
              and stays where the single button always was, so the gesture people
              already learned still does what it did; the second sits above it,
              quieter, because convening a jornada is the rarer act and the one
              that ends at a sign-in. */}
          {reportEntries.length > 0 && (
            <div className="absolute bottom-4 left-2 z-10 flex flex-col-reverse items-start gap-2">
              {reportEntries.map(({ href, label, icon: Icon }, index) => (
                <Link
                  key={href}
                  // The barrio being looked at travels to the form, which opens
                  // with it already chosen and its map already framed there.
                  // In the URL rather than in state: the form is another route,
                  // and this way the link survives a reload and can be pasted.
                  href={
                    barrio
                      ? `${href}?barrio=${encodeURIComponent(barrio.name)}`
                      : href
                  }
                  className={cn(
                    "focus-visible:ring-ring flex items-center gap-2 rounded-full text-sm font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none",
                    index === 0
                      ? "bg-primary text-primary-foreground py-3 pr-4 pl-3.5"
                      : "bg-background/95 border py-2 pr-3.5 pl-3 text-xs backdrop-blur",
                  )}
                >
                  <Icon
                    className={index === 0 ? "size-4" : "size-3.5"}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Below the map on a phone, beside it on a laptop. Which of the two
            gets the space depends on the section: for places the map is the
            product, for animals and services the panel is. */}
        <aside
          className={cn(
            "bg-background flex min-h-0 flex-col border-t md:border-t-0 md:border-l",
            panelLeads
              ? "flex-1 overflow-y-auto"
              : "h-[38dvh] shrink-0 md:h-auto md:w-80",
          )}
        >
          {/* Same block on every section, above whatever the section itself
              renders — the balance is context for the whole app, not one tab
              of it. */}
          <BalancePanel
            report={report}
            neighborhoodStatuses={neighborhoodStatuses}
            showBarrios={showBarrios}
            onBarriosChange={setShowBarrios}
          />
          {children}
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
