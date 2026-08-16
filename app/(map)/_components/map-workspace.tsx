"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Map, MapControls } from "@/components/ui/map";

import type { SiteDTO, SiteStatus } from "@/data/site/site.dto";
import type { AnimalDTO } from "@/data/animal/animal.dto";
import type {
  NeighborhoodNeedDTO,
  NeighborhoodStatusDTO,
} from "@/data/neighborhood/neighborhood.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import { BARRIO_PANEL, PANEL_LABEL } from "@/lib/labels";
import {
  ALL_REPORT_ENTRIES,
  DEFAULT_TAB_ID,
  SITE_TYPE_TAB,
  initialChipForTab,
  type PanelChip,
  type TabId,
} from "@/lib/tabs";
import { createClient } from "@/lib/supabase/client";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { AnimalPopup } from "./animal-popup";
import { BarrioHeader } from "./barrio-header";
import { BarrioLayer, type BarrioProps } from "./barrio-layer";
import { LiveClock } from "./live-clock";
import { MapCard, type CardInset } from "./map-card";
import { ClearSelectionOnTap, FitToSites, FlyToSelected } from "./map-camera";
import { ReportMenu } from "./report-menu";
import { ResourceOfferMarkers } from "./resource-offer-markers";
import { ResourceOfferPopup } from "./resource-offer-popup";
import { SharedLinkBar } from "./shared-link-bar";
import { SightingMarkers } from "./sighting-markers";
import { WorkOrderMarkers } from "./work-order-markers";
import { WorkOrderPopup } from "./work-order-popup";
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
   *  before anyone touches anything.
   *
   *  Its presence is also what puts the "Ver todo el mapa" chip on screen
   *  (see `SharedLinkBar`) — only the four `[id]` routes ever pass it, and
   *  they are exactly the routes that need a way out. The chip stays after
   *  the card is closed: the reader is still on a route about one pin, and
   *  that has to remain visible even once the pin's card is gone. */
  initialSelectedId?: string;
  /** Seeds which chip the panel opens on (see `initialChipForTab`). The tab
   *  layout leaves this off and lets the active route segment decide;
   *  `/punto/[id]` sets it explicitly, because there the section is a
   *  property of the pin that was shared. Only a seed — the reader can still
   *  pick a different chip afterwards. */
  tab?: TabId;
  /** Extra content rendered above the panel, for a route that has something
   *  to say that belongs to no family and so does not belong inside
   *  `UnifiedPanel`. Nothing passes it today. */
  children?: React.ReactNode;
  /** A curator, signed in — see `WorkspaceValue.isAdmin`. Resolved once,
   *  server-side, by whichever route rendered this. */
  isAdmin?: boolean;
};

/**
 * The map, the (now icon-only) quick-jump row, and the one panel that
 * carries all the actual filtering.
 *
 * Every family draws on the map unconditionally — casos, sitios, located
 * animal sightings, located resource offers — nothing is hidden for belonging
 * to the "wrong" section. What changed hands to `UnifiedPanel` is the
 * filtering itself: its own row of chips (Todo, Necesidades, Sitios,
 * Mascotas, Servicios) is the one control surface for what the panel lists,
 * and it never gates the map. `activeChip` is that state, shared
 * through the workspace context so `UnifiedPanel` can read and change it and
 * this component's own primary button can jump straight to one.
 */
export function MapWorkspace({
  sites,
  animals = [],
  resourceOffers = [],
  workOrders = [],
  neighborhoodStatuses = [],
  neighborhoodNeeds = [],
  initialSelectedId,
  tab: forcedTab,
  children,
  isAdmin = false,
}: Props) {
  const sharedLink = initialSelectedId !== undefined;
  const router = useRouter();

  // Everything that behaves differently rather than just looking different
  // hangs off this: where a card opens, whether the panel starts shut, and
  // whether a selection collapses it. See `lib/use-media-query.ts`.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  /**
   * Seeded once, from `forcedTab` when the caller is one of the four shared
   * entity routes, or `DEFAULT_TAB_ID` at the bare `/`.
   *
   * This used to also resync from the active child route segment, for the
   * era when `(tabs)/layout.tsx` had siblings (`/necesito`, `/mascotas`,
   * `/servicios`) it stayed mounted across while a reader moved between
   * them. It has none now — every section lives behind a chip inside `/`
   * instead of its own route — and the four shared-entity routes each own
   * their page outright, so navigating between e.g. `/punto/a` and
   * `/necesidad/b` remounts `MapWorkspace` fresh with the new `forcedTab`
   * rather than needing to be told about a change. A plain initializer is
   * what is left once syncing has nothing to sync from.
   */
  const [activeChip, setActiveChip] = useState<PanelChip>(() =>
    initialChipForTab(forcedTab ?? DEFAULT_TAB_ID),
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  // How much of the map the open card is covering, reported by `MapCard` and
  // spent by the camera (see `FlyToSelected`): the drawer's height on a
  // phone, the left sheet's width beside the map.
  const [cardInset, setCardInset] = useState<CardInset>({ bottom: 0, left: 0 });
  // Which barrio the map is centred on. Zoomed in you are inside one, its
  // outline is off-screen and the wash is invisible, so the layer looks dead
  // even though it is working. This says where you are without a cursor —
  // which also makes it the only version of this that exists on a phone.
  const [centreBarrio, setCentreBarrio] = useState<string | null>(null);
  // Which barrio the cursor is over, on the inputs that have a cursor. It
  // took over from a label that followed the pointer around the map (see
  // `BarrioLayer`): the same fact, in the corner that was already reporting a
  // barrio name, instead of a second one floating over the thing it names.
  const [hoverBarrio, setHoverBarrio] = useState<string | null>(null);
  // The barrio being filtered by, set by tapping one on the map. Null is the
  // whole city, which is where everyone starts.
  const [barrio, setBarrio] = useState<BarrioProps | null>(null);
  /**
   * Shut or open, remembered separately for each width.
   *
   * They are genuinely different defaults, not one preference read twice. On
   * a phone the panel and the map are stacked and fighting over the same
   * screen, so the map — the thing people came for — starts with all of it
   * and the panel waits as a bar that still says the barrio and the count. On
   * a desktop they sit side by side and neither costs the other anything, so
   * the panel starts open.
   *
   * One shared flag would mean rotating a phone, or dragging a window across
   * a breakpoint, silently applying a decision made about the other layout.
   */
  const [collapsedByWidth, setCollapsedByWidth] = useState({
    mobile: true,
    desktop: false,
  });
  const panelCollapsed = isDesktop
    ? collapsedByWidth.desktop
    : collapsedByWidth.mobile;

  const setPanelCollapsed = useCallback(
    (collapsed: boolean) =>
      setCollapsedByWidth((previous) =>
        isDesktop
          ? { ...previous, desktop: collapsed }
          : { ...previous, mobile: collapsed },
      ),
    [isDesktop],
  );

  /**
   * Selecting anything, from the map or from the panel's own list.
   *
   * On a phone the two surfaces cannot both have the bottom half of the
   * screen, and the card is the one that was just asked for — so the panel
   * folds back to its bar. It does NOT unfold again when the card closes:
   * whoever wants the list back says so, rather than watching two animations
   * play every time they dismiss something.
   */
  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id !== null && !isDesktop) {
        setCollapsedByWidth((previous) => ({ ...previous, mobile: true }));
      }
    },
    [isDesktop],
  );

  /**
   * Putting the card away — the close button, Escape, a tap on bare map.
   *
   * On the plain `/` this is just a deselection. On one of the four shared
   * routes it also LEAVES the route, because those pages are about one pin
   * and dismissing its card left the reader on a URL that still claims to be
   * about something no longer on screen — an app-looking page quietly still
   * scoped to a single case, with the "Ver todo el mapa" chip as the only
   * hint that anything was different.
   *
   * `replace`, not `push`: the shared URL and `/` are the same visit, and
   * pushing would make Back re-open a card the reader just dismissed.
   */
  const dismiss = useCallback(() => {
    setSelectedId(null);
    if (sharedLink) router.replace("/");
  }, [sharedLink, router]);

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
   * One selection, four families, one card.
   *
   * Animals and offers used to be the two that could be selected and had
   * nothing to show for it — the marker grew and that was all. They have
   * their own cards now (`AnimalPopup`, `ResourceOfferPopup`), which is what
   * makes "tap anything on this map and it tells you about itself" true
   * rather than nearly true.
   *
   * `coordinates` is null for the ones that genuinely have no point: a lost
   * animal reported by barrio, a truck lent across the whole city. Those
   * still open a card — they just open it without moving the camera, because
   * there is nowhere honest to move it to.
   */
  const selectedEntity = useMemo(() => {
    if (!selectedId) return null;

    const site = withLiveStatus.find((row) => row.id === selectedId);
    if (site) {
      return {
        coordinates: { longitude: site.longitude, latitude: site.latitude },
        card: <SitePopup site={site} />,
      };
    }

    const order = workOrders.find((row) => row.id === selectedId);
    if (order) {
      return {
        coordinates: { longitude: order.longitude, latitude: order.latitude },
        card: <WorkOrderPopup order={order} />,
      };
    }

    const animal = animals.find((row) => row.id === selectedId);
    if (animal) {
      return {
        coordinates:
          animal.longitude !== null && animal.latitude !== null
            ? { longitude: animal.longitude, latitude: animal.latitude }
            : null,
        card: <AnimalPopup animal={animal} />,
      };
    }

    const offer = resourceOffers.find((row) => row.id === selectedId);
    if (offer) {
      return {
        coordinates:
          offer.longitude !== null && offer.latitude !== null
            ? { longitude: offer.longitude, latitude: offer.latitude }
            : null,
        card: <ResourceOfferPopup offer={offer} />,
      };
    }

    return null;
  }, [selectedId, withLiveStatus, workOrders, animals, resourceOffers]);

  /**
   * Some chips are not about places at all.
   *
   * A lost animal has no location — that is what lost means — and a service
   * moves by definition. For those the panel is the product and the map shrinks
   * to a zone reference, rather than the other way round.
   */
  const panelLeads = activeChip === "pets" || activeChip === "services";

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
      animals,
      resourceOffers: panelResourceOffers,
      workOrders: panelWorkOrders,
      neighborhoodNeeds,
      selectedId,
      select,
      barrio,
      clearBarrio: () => setBarrio(null),
      selectBarrioByName: (name: string) =>
        setBarrio({ id: name, name, comuna: null, lon: 0, lat: 0 }),
      barrioStatus,
      neighborhoodStatuses,
      panelCollapsed,
      setPanelCollapsed,
      isAdmin,
    }),
    [
      activeChip,
      panelSites,
      animals,
      panelResourceOffers,
      panelWorkOrders,
      neighborhoodNeeds,
      selectedId,
      select,
      barrio,
      barrioStatus,
      neighborhoodStatuses,
      panelCollapsed,
      setPanelCollapsed,
      isAdmin,
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
        {/* The map takes whatever the panel does not, at every width and in
            both states — it is the one element here that is happy at any
            size. All the sizing decisions live on the aside below, which
            replaced a pair of mirrored rules that had the map fixed and the
            panel growing for some chips and the reverse for others. */}
        <div className="relative min-h-0 flex-1">
          <Map
            className="h-full w-full"
            center={[MANIZALES.longitude, MANIZALES.latitude]}
            zoom={MANIZALES.zoom}
            maxBounds={CITY_BOUNDS}
          >
            {/* Bottom-right because the clock holds the top-right corner.

                Two of the four controls are gone. Zoom +/- duplicates a
                gesture every one of these readers already owns — pinch on a
                phone, wheel on a desktop — and full screen is a promise this
                app cannot keep: the map is already the screen, and the panel
                beside it is not decoration to be hidden, it is where the
                actions live (it collapses from its own header instead).

                What is left earns its place. "Ubice" is the shortest
                possible answer to "¿dónde ayudo hoy?" — aquí, a 300 metros —
                and the compass is the only way back to north once the map
                has been rotated by a two-finger drag nobody meant to make. */}
            {/* `showZoom={false}` explicitly: mapcn defaults it to true, so
                dropping the prop brought the +/- back rather than removing
                it. showFullscreen already defaults to false. */}
            <MapControls
              position="bottom-right"
              showZoom={false}
              showLocate
              showCompass
            />
            <BarrioLayer
              onCentreChange={setCentreBarrio}
              onHoverChange={setHoverBarrio}
              selected={barrio?.name ?? null}
              onSelect={setBarrio}
              statuses={neighborhoodStatuses}
            />
            {/* Framed over everything the map can ever draw, once, on load. */}
            <FitToSites
              sites={[
                ...mapSites,
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
            <FlyToSelected
              site={selectedEntity?.coordinates ?? null}
              inset={cardInset}
            />

            {/* A tap on bare map puts the card away. Dragging does not — see
                `ClearSelectionOnTap`, which leans on MapLibre's own
                tap-versus-pan distinction rather than inventing one. */}
            <ClearSelectionOnTap onTap={dismiss} />

            <SiteMarkers sites={mapSites} selectedId={selectedId} onSelect={select} />

            <WorkOrderMarkers
              workOrders={workOrders}
              selectedId={selectedId}
              onSelect={select}
            />

            <SightingMarkers
              animals={animals}
              selectedId={selectedId}
              onSelect={select}
            />

            <ResourceOfferMarkers
              resourceOffers={resourceOffers}
              selectedId={selectedId}
              onSelect={select}
            />

            {/* One card for every family, docked to whichever edge the screen
                can spare — a sheet along the left beside the map, a drawer
                along the bottom under it. Rendered from state rather than
                from MarkerPopup's own click toggle, because a shared link has
                to open it without a click. See `MapCard`. */}
            {selectedEntity && (
              <MapCard
                onClose={dismiss}
                onInsetChange={setCardInset}
              >
                {selectedEntity.card}
              </MapCard>
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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-3">
            {/* Left corner, and only while the reader is on a shared route:
                the one explicit way back to the whole map. Everything else up
                here has always lived on the right. */}
            <div className="pointer-events-auto">
              {sharedLink && <SharedLinkBar />}
            </div>

            <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
              {/* Hidden below `lg`: the clock is reassurance ("this is
                  live"), not a control, and on a narrower screen the barrio
                  chip below it matters more. */}
              <div className="hidden lg:block">
                <LiveClock />
              </div>
                {/* One slot, two states. While a barrio is filtered the chip
                    IS the filter and carries the way out of it; otherwise it
                    names a barrio — the one under the cursor if there is a
                    cursor, and the one the map is centred on otherwise.

                    The hover reading took over from a label that trailed the
                    pointer across the map. Same fact, and this corner was
                    already spending itself on a barrio name, so the label was
                    a second answer to the same question that also covered the
                    barrio it was naming. Falling back to the centre keeps the
                    chip alive on a phone, where nothing hovers. */}
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
                  (hoverBarrio ?? centreBarrio) && (
                    <span className="bg-background/90 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium shadow-sm backdrop-blur">
                      {hoverBarrio ?? centreBarrio}
                    </span>
                  )
                )}
            </div>
          </div>

          {/* Bottom-left: the thumb's reach on a phone, and clear of the map
              controls on the right.

              One button, the same one on every chip, carrying every form in
              the app. It used to change with the filter: a promoted primary
              action per chip, plus a "+" holding whatever that chip did not
              promote. Which meant the way to report a lost animal existed
              only while the Mascotas filter happened to be open — the filter
              is about what the reader is LOOKING at, and it was silently
              deciding what they were allowed to WRITE. Reporting is not a
              view of the data, so it does not narrow with one. */}
          <div className="absolute bottom-4 left-2 z-10">
            <ReportMenu entries={ALL_REPORT_ENTRIES} barrio={barrio?.name ?? null} />
          </div>
        </div>

        {/* Below the map until `lg`, beside it from there, and the only
            element that states a size — height while stacked, width while
            side by side. Collapsing now works at both widths: a bar on a
            phone, a rail on a desktop, and either way the map takes back
            everything it gives up. */}
        <aside
          className={cn(
            "bg-background flex min-h-0 shrink-0 flex-col overflow-hidden border-t transition-[height,width] duration-300 lg:h-auto lg:border-t-0 lg:border-l",
            panelCollapsed
              ? "h-12 lg:w-11"
              : panelLeads
                ? // A photo board and a card grid read badly in a column
                  // sized for one-line rows, so those two chips get a wider
                  // panel — a wider panel, not the inverted layout this used
                  // to do, where the map shrank to a fixed 38% and the panel
                  // grew. The map stays the bigger half; it is still a map.
                  "h-[62dvh] lg:w-[32rem] xl:w-[40rem]"
                : // Just over half the screen on a phone. The panel is where
                  // every action lives now, and a third of a phone screen was
                  // not enough to read a card and its buttons without
                  // scrolling for each one.
                  "h-[58dvh] lg:w-[22rem] xl:w-[26rem]",
          )}
        >
          {/* The header is the collapse control at every width now — see
              `BarrioHeader`, which renders the shut states too. */}
          <BarrioHeader />

          {/* Collapsed, the aside is only as tall (or wide) as that header;
              not rendering the rest avoids a clipped, still-scrollable panel
              sitting invisibly underneath it. */}
          {!panelCollapsed && (
            <div className="flex min-h-0 flex-1 flex-col">
              {children}
              <UnifiedPanel />

              {/* The panel's bottom edge — the app's one quiet corner, since
                  every corner of the map itself is already spoken for (the
                  clock, the barrio chip, the map controls, "Reportar").
                  Outside the scrolling region on purpose: a way to reach a
                  human should not be something you have to scroll a list of
                  emergencies to the end to find. */}
              <div className="text-muted-foreground shrink-0 border-t px-3 py-1.5 text-[0.6rem]">
                {PANEL_LABEL.contactPrompt}{" "}
                <a
                  href={`mailto:${PANEL_LABEL.contactEmail}`}
                  className="hover:text-foreground underline"
                >
                  {PANEL_LABEL.contactEmail}
                </a>
              </div>
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
