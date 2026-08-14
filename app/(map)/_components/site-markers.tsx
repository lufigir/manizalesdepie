"use client";

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
        cluster.sites.length === 1 ? (
          <SinglePin
            key={cluster.key}
            site={cluster.sites[0]}
            selected={selectedId === cluster.sites[0].id}
            onSelect={onSelect}
          />
        ) : (
          <ClusterPin key={cluster.key} cluster={cluster} />
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
          on touch, and it makes a dense area readable. */}
      <MarkerTooltip offset={20}>{site.name}</MarkerTooltip>
    </MapMarker>
  );
}

function ClusterPin({ cluster }: { cluster: Cluster }) {
  const { map } = useMap();

  const open = cluster.sites.filter((s) => s.status === "open").length;
  const types = [...new Set(cluster.sites.map((s) => s.type))];
  // One icon only when the group is of one kind. A mixed group gets the count
  // alone rather than an arbitrary winner, which would misdescribe the rest.
  const Icon = types.length === 1 ? SITE_TYPE_ICON[types[0]] : null;

  function expand() {
    if (!map) return;

    const lons = cluster.sites.map((s) => s.longitude);
    const lats = cluster.sites.map((s) => s.latitude);

    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      // Generous padding and a floor on the zoom: several of these sit within
      // metres of each other, and fitting them exactly would jump to maximum
      // zoom and lose all context.
      { padding: 140, maxZoom: 17, duration: 600 },
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
          aria-label={`${cluster.sites.length} puntos agrupados, ${open} abiertos. Toca para acercar.`}
        >
          {Icon && <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          <span className="text-xs font-bold tabular-nums">
            {cluster.sites.length}
          </span>
        </span>
      </MarkerContent>
      <MarkerTooltip offset={22}>
        {cluster.sites
          .slice(0, 4)
          .map((s) => s.name)
          .join(" · ")}
        {cluster.sites.length > 4 && ` y ${cluster.sites.length - 4} más`}
      </MarkerTooltip>
    </MapMarker>
  );
}
