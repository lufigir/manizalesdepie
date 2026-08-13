"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map";

import type { SiteDTO, SiteStatus, SiteType } from "@/data/site/site.dto";
import { SITE_TYPES } from "@/data/site/site.dto";
import { SITE_TYPE_COLOR, SITE_TYPE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { SiteSheet } from "./site-sheet";

/** Manizales sits on a ridge running east–west; this framing holds the city
 *  and Villamaría across the river without either falling off the edge. */
const MANIZALES = { longitude: -75.5074, latitude: 5.0631, zoom: 12.4 };

type Props = {
  sites: SiteDTO[];
  curatorWhatsapp: string;
};

export function MapShell({ sites, curatorWhatsapp }: Props) {
  // One category active at a time. This is the anti-clutter rule: saturation is
  // not solved by layout, it is solved by deciding what is not drawn.
  const [activeType, setActiveType] = useState<SiteType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const liveStatus = useLiveSiteStatus();

  const withLiveStatus = useMemo(
    () =>
      sites.map((site) => ({
        ...site,
        status: liveStatus[site.id] ?? site.status,
      })),
    [sites, liveStatus],
  );

  const visible = useMemo(
    () =>
      activeType === "all"
        ? withLiveStatus
        : withLiveStatus.filter((site) => site.type === activeType),
    [withLiveStatus, activeType],
  );

  const selected = withLiveStatus.find((site) => site.id === selectedId) ?? null;
  const openNow = withLiveStatus.filter((site) => site.status === "open").length;

  return (
    <div className="relative h-full w-full">
      <Map
        className="h-full w-full"
        center={[MANIZALES.longitude, MANIZALES.latitude]}
        zoom={MANIZALES.zoom}
      >
        <MapControls />
        {visible.map((site) => (
          <MapMarker
            key={site.id}
            longitude={site.longitude}
            latitude={site.latitude}
            onClick={() => setSelectedId(site.id)}
          >
            <MarkerContent>
              <span
                className={cn(
                  "ring-background block size-4 rounded-full ring-2 transition-transform",
                  SITE_TYPE_COLOR[site.type],
                  site.status === "closed" && "opacity-40",
                  selectedId === site.id && "scale-150",
                )}
                aria-label={`${SITE_TYPE_LABEL[site.type]}: ${site.name}`}
              />
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>

      {/* Live summary. This is the "¿dónde ayudo hoy?" answer, first thing,
          before the reader has to filter anything themselves. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="bg-background/90 pointer-events-auto flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
          <span className="bg-resolved size-2 animate-pulse rounded-full" />
          <span className="tabular-nums">
            HOY: {openNow} de {withLiveStatus.length} puntos abiertos
          </span>
        </div>

        <div className="pointer-events-auto -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Chip
            active={activeType === "all"}
            onClick={() => setActiveType("all")}
            label="Todo"
          />
          {SITE_TYPES.map((type) => (
            <Chip
              key={type}
              active={activeType === type}
              onClick={() => setActiveType(type)}
              label={SITE_TYPE_LABEL[type]}
              dotClass={SITE_TYPE_COLOR[type]}
            />
          ))}
        </div>
      </div>

      {selected ? (
        <SiteSheet site={selected} onClose={() => setSelectedId(null)} />
      ) : (
        <a
          href={`https://wa.me/${curatorWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground absolute inset-x-3 bottom-3 z-10 rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg"
        >
          ¿Necesitas ayuda? Escríbenos por WhatsApp
        </a>
      )}

      {visible.length === 0 && (
        <p className="bg-background/90 absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-4 py-3 text-center text-sm shadow-sm backdrop-blur">
          No hay puntos de esta categoría todavía.
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background/90 hover:bg-accent",
      )}
    >
      {dotClass && <span className={cn("size-2 rounded-full", dotClass)} />}
      {label}
    </button>
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
