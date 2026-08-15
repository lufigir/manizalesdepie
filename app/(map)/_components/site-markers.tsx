"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from "@/components/ui/map";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  CONFIDENCE_MARKER,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  confidence,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useClusters, type Cluster } from "./use-clusters";

/**
 * Every pin on the map, grouped when they would otherwise sit on top of each
 * other. Downtown Manizales puts a dozen hospitals inside a few blocks, which
 * at city zoom is a single unreadable blob.
 */
export function SiteMarkers({
  sites,
  selectedId,
  onSelect,
}: {
  sites: SiteDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const clusters = useClusters(sites);

  return (
    <>
      {clusters.map((cluster) =>
        cluster.items.length === 1 ? (
          <SinglePin
            key={cluster.key}
            site={cluster.items[0]}
            selected={selectedId === cluster.items[0].id}
            onSelect={onSelect}
          />
        ) : (
          <ClusterPin
            key={cluster.key}
            cluster={cluster}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ),
      )}
    </>
  );
}

function SinglePin({
  site,
  selected,
  onSelect,
}: {
  site: SiteDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = SITE_TYPE_ICON[site.type];
  const { level, label: confidenceLabel } = confidence(site);

  return (
    <MapMarker
      longitude={site.longitude}
      latitude={site.latitude}
      onClick={() => onSelect(site.id)}
    >
      <MarkerContent>
        {/* The icon says what it is, the fill says whether it helps right now,
            and the solidity says how much anyone has vouched for it. Three
            facts, three channels, no legend needed to read the first one. */}
        <span
          className={cn(
            "ring-background flex size-7 items-center justify-center rounded-full shadow-md ring-2 transition-transform",
            SITE_STATUS_MARKER[site.status],
            CONFIDENCE_MARKER[level],
            selected && "scale-125",
          )}
          aria-label={`${SITE_TYPE_LABEL[site.type]}: ${site.name}. ${
            SITE_STATUS_LABEL[site.status]
          }. ${confidenceLabel}`}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
      </MarkerContent>
      {/* Names the pin before committing to a tap. Cheap on desktop, ignored
          on touch, and it makes a dense area readable. Suppressed once
          selected: a click never moves the cursor off the marker, so the
          tooltip would otherwise sit on top of the popup card it just
          opened. */}
      {!selected && <MarkerTooltip offset={20}>{site.name}</MarkerTooltip>}
    </MapMarker>
  );
}

/** Metres across a group, used to decide whether zoom can ever separate it. */
function spreadInMetres(sites: SiteDTO[]): number {
  const lons = sites.map((s) => s.longitude);
  const lats = sites.map((s) => s.latitude);
  const dLon = Math.max(...lons) - Math.min(...lons);
  const dLat = Math.max(...lats) - Math.min(...lats);
  const lat = ((Math.max(...lats) + Math.min(...lats)) / 2) * (Math.PI / 180);
  return (
    Math.hypot(dLon * Math.cos(lat), dLat) * ((Math.PI / 180) * 6371000)
  );
}

function ClusterPin({
  cluster,
  selectedId,
  onSelect,
}: {
  cluster: Cluster<SiteDTO>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { map } = useMap();
  const [fanned, setFanned] = useState(false);

  const open = cluster.items.filter((s) => s.status === "open").length;
  const types = [...new Set(cluster.items.map((s) => s.type))];
  // One icon only when the group is of one kind. A mixed group gets the count
  // alone rather than an arbitrary winner, which would misdescribe the rest.
  const Icon = types.length === 1 ? SITE_TYPE_ICON[types[0]] : null;

  /**
   * Two things live at the same address here — the Coliseo Menor is both a
   * shelter and the city's official donation point, on identical coordinates.
   * Zooming can never separate those: their distance in pixels is zero at
   * every scale, and fitBounds on a zero-area box just slams to max zoom with
   * the pins still stacked.
   *
   * So when a group is too tight for zoom to help, it fans out instead — the
   * members swing onto a small circle around the centre and each becomes its
   * own target. Zoom stays the answer for groups that are merely close.
   */
  function expand() {
    if (!map) return;

    const spread = spreadInMetres(cluster.items);
    const atMaxZoom = map.getZoom() >= 16.5;

    if (spread < 12 || atMaxZoom) {
      setFanned(true);
      return;
    }

    const lons = cluster.items.map((s) => s.longitude);
    const lats = cluster.items.map((s) => s.latitude);

    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      // Generous padding and a ceiling on the zoom: fitting a tight group
      // exactly would jump to maximum zoom and lose all context.
      { padding: 140, maxZoom: 17, duration: 600 },
    );
  }

  if (fanned) {
    return (
      <FannedCluster
        cluster={cluster}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelect(id);
          setFanned(false);
        }}
        onCollapse={() => setFanned(false)}
      />
    );
  }

  return (
    <MapMarker
      longitude={cluster.longitude}
      latitude={cluster.latitude}
      onClick={expand}
    >
      <MarkerContent>
        <span
          className={cn(
            "ring-background bg-background text-foreground flex size-9 items-center justify-center gap-0.5 rounded-full shadow-md ring-2 transition-transform hover:scale-110",
            // Any open point in the group tints the whole thing, because the
            // question underneath is "is there anything useful here".
            open > 0 && "text-resolved",
          )}
          aria-label={`${cluster.items.length} puntos agrupados, ${open} abiertos. Toca para acercar.`}
        >
          {Icon && <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          <span className="text-xs font-bold tabular-nums">
            {cluster.items.length}
          </span>
        </span>
      </MarkerContent>
      <MarkerTooltip offset={22}>
        {cluster.items
          .slice(0, 4)
          .map((s) => s.name)
          .join(" · ")}
        {cluster.items.length > 4 && ` y ${cluster.items.length - 4} más`}
      </MarkerTooltip>
    </MapMarker>
  );
}

/**
 * A group opened out into a ring.
 *
 * Every member is rendered at the SAME coordinate — the cluster centre — and
 * pushed onto the circle with a CSS transform. Offsetting in pixels rather than
 * inventing fake coordinates matters: the fan must not change what the map
 * claims about where anything is, and a translated element keeps its hit area
 * with it, so each pin stays independently tappable.
 *
 * The radius grows with the count so six pins do not overlap each other on the
 * ring after escaping the pile they came from.
 */
function FannedCluster({
  cluster,
  selectedId,
  onSelect,
  onCollapse,
}: {
  cluster: Cluster<SiteDTO>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCollapse: () => void;
}) {
  const count = cluster.items.length;
  const radius = Math.max(30, Math.min(62, 11 * count));

  return (
    <>
      {/* The centre becomes the way back, so the fan is never a trap. */}
      <MapMarker
        longitude={cluster.longitude}
        latitude={cluster.latitude}
        onClick={onCollapse}
      >
        <MarkerContent>
          <span
            className="bg-background/90 text-muted-foreground ring-background hover:text-foreground flex size-6 items-center justify-center rounded-full shadow-md ring-2 backdrop-blur"
            aria-label="Cerrar el grupo"
          >
            <X className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
        </MarkerContent>
      </MapMarker>

      {cluster.items.map((site, index) => {
        // Start at twelve o'clock so the first pin is never hidden behind the
        // popup, which opens above the marker.
        const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const Icon = SITE_TYPE_ICON[site.type];
        const { level, label: confidenceLabel } = confidence(site);

        return (
          <MapMarker
            key={site.id}
            longitude={cluster.longitude}
            latitude={cluster.latitude}
            onClick={() => onSelect(site.id)}
          >
            <MarkerContent>
              <span
                className="block transition-transform duration-200"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <span
                  className={cn(
                    "ring-background flex size-7 items-center justify-center rounded-full shadow-md ring-2",
                    SITE_STATUS_MARKER[site.status],
                    CONFIDENCE_MARKER[level],
                    selectedId === site.id && "scale-125",
                  )}
                  aria-label={`${SITE_TYPE_LABEL[site.type]}: ${site.name}. ${
                    SITE_STATUS_LABEL[site.status]
                  }. ${confidenceLabel}`}
                >
                  <Icon className="size-4" strokeWidth={2.5} aria-hidden />
                </span>
              </span>
            </MarkerContent>
            {/* Same suppression as the single pin: once this fanned member is
                the selection, its own tooltip would collide with the popup
                that opens right under the click. */}
            {selectedId !== site.id && (
              <MarkerTooltip offset={20}>{site.name}</MarkerTooltip>
            )}
          </MapMarker>
        );
      })}
    </>
  );
}
