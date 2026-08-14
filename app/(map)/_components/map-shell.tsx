"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Map, MapControls, MapPopup } from "@/components/ui/map";

import type { SiteDTO, SiteStatus } from "@/data/site/site.dto";
import type { SituationReportDTO } from "@/data/situation/situation.dto";
import {
  SITE_TYPE_LAYER,
  type ActionLayer,
  type ContextLayer,
} from "@/lib/layers";
import { createClient } from "@/lib/supabase/client";

import { ComunaLayer, type ComunaHover } from "./comuna-layer";
import { ComunaTooltip } from "./comuna-tooltip";
import { LayerControl } from "./layer-control";
import { LiveClock } from "./live-clock";
import { FitToSites, FlyToSelected } from "./map-camera";
import { SiteList } from "./site-list";
import { SiteMarkers } from "./site-markers";
import { SitePopup } from "./site-popup";
import { SituationCard } from "./situation-card";

/** Manizales sits on a ridge running east–west. Only the starting frame before
 *  FitToSites takes over; it holds the city and Villamaría across the river. */
const MANIZALES = { longitude: -75.5074, latitude: 5.0631, zoom: 12.4 };

type Props = {
  sites: SiteDTO[];
  /** The Alcaldía's latest balance, or null once it has expired. */
  report?: SituationReportDTO | null;
  /** Set when arriving from a shared link. The map opens already centred on
   *  that pin with its sheet up, because the question the link was sent to
   *  answer is "¿por dónde queda exactamente?" and it should be answered
   *  before anyone touches anything. */
  initialSelectedId?: string;
};

export function MapShell({ sites, report, initialSelectedId }: Props) {
  // One action layer at a time — choosing one is choosing what NOT to look at.
  // Context layers stack, because they answer a different question at the same
  // time. This is the anti-clutter rule: saturation is not solved by layout, it
  // is solved by deciding what is not drawn.
  const [action, setAction] = useState<ActionLayer>("help");
  const [context, setContext] = useState<Set<ContextLayer>>(
    () => new Set<ContextLayer>(["infrastructure", "comunas"]),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  // What is inside the comuna under the cursor. Nothing is labelled on the
  // polygons themselves; the information appears where the eye already is.
  const [hoveredComuna, setHoveredComuna] = useState<ComunaHover | null>(null);
  // Plain text filter over what is already loaded. Not geocoding: nothing
  // leaves the device, so it still works with no signal.
  const [query, setQuery] = useState("");

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
   * What is drawn: the chosen action layer, plus every context layer that is
   * switched on. Today both come out of `site`, split by type — a hospital is
   * context, an acopio is action. As the other entities arrive they join the
   * action layers they belong to and this stays the only place that decides.
   */
  const visible = useMemo(() => {
    return withLiveStatus.filter((site) => {
      const layer = SITE_TYPE_LAYER[site.type];
      if (layer === action) return true;
      return context.has(layer as ContextLayer);
    });
  }, [withLiveStatus, action, context]);

  /** Per-layer counts, so an empty layer is visible before it is chosen. */
  const counts = useMemo(() => {
    const base: Record<ActionLayer, number> = {
      help: 0,
      requests: 0,
      animals: 0,
      resources: 0,
    };
    for (const site of withLiveStatus) {
      const layer = SITE_TYPE_LAYER[site.type];
      if (layer in base) base[layer as ActionLayer] += 1;
    }
    return base;
  }, [withLiveStatus]);

  // The list is filtered further by the text box; the map is not, so a filter
  // never makes a pin silently vanish from under the reader's finger.
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((site) =>
      [site.name, site.address, site.neighborhood]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [visible, query]);

  const selected = withLiveStatus.find((site) => site.id === selectedId) ?? null;
  const openNow = withLiveStatus.filter((site) => site.status === "open").length;

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <Map
          className="h-full w-full"
          center={[MANIZALES.longitude, MANIZALES.latitude]}
          zoom={MANIZALES.zoom}
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
          <ComunaLayer sites={visible} onHover={setHoveredComuna} />
          <FitToSites sites={visible} />
          <FlyToSelected site={selected} />

          <SiteMarkers
            sites={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Anchored to the pin rather than sliding over the map, so the
              answer and its place on the map stay on screen together. Rendered
              from state instead of MarkerPopup's built-in click toggle,
              because a shared link has to open it without a click.

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
        </Map>

        {/* Live summary. This is the "¿dónde ayudo hoy?" answer, first thing,
            before the reader has to filter anything themselves. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-background/90 pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
              <span className="bg-resolved size-2 animate-pulse rounded-full" />
              <span className="tabular-nums">
                HOY: {openNow} de {withLiveStatus.length} puntos abiertos
              </span>
            </div>
            <LiveClock />
          </div>

          {report && (
            <div className="pointer-events-none mt-1 self-start">
              <SituationCard report={report} />
            </div>
          )}

          <LayerControl
            action={action}
            onActionChange={setAction}
            context={context}
            counts={counts}
            onContextToggle={(layer) =>
              setContext((current) => {
                const next = new Set(current);
                if (next.has(layer)) next.delete(layer);
                else next.add(layer);
                return next;
              })
            }
          />
        </div>

        {hoveredComuna && <ComunaTooltip hover={hoveredComuna} />}

        {/* Bottom-left: the thumb's reach on a phone, and clear of the map
            controls on the right. This is the only write path the city has. */}
        <Link
          href="/reportar"
          // left-16 clears mapcn's compass, which sits bottom-left regardless
          // of where MapControls is placed. Still within thumb reach.
          className="bg-primary text-primary-foreground focus-visible:ring-ring absolute bottom-4 left-16 z-10 flex items-center gap-2 rounded-full py-3 pr-4 pl-3.5 text-sm font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="size-4" strokeWidth={3} aria-hidden />
          Reportar
        </Link>

        {visible.length === 0 && (
          <p className="bg-background/90 absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-4 py-3 text-center text-sm shadow-sm backdrop-blur">
            No hay puntos de esta categoría todavía.
          </p>
        )}
      </div>

      {/* Below the map on a phone, beside it on a laptop. The map keeps the
          larger share either way: it is the product. */}
      <SiteList
        sites={listed}
        query={query}
        onQueryChange={setQuery}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
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
