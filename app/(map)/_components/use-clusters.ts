"use client";

import { useEffect, useMemo, useState } from "react";

import { useMap } from "@/components/ui/map";
import type { SiteDTO } from "@/data/site/site.dto";

export type Cluster = {
  key: string;
  sites: SiteDTO[];
  longitude: number;
  latitude: number;
};

/**
 * Groups pins that overlap on screen.
 *
 * Written by hand rather than using mapcn's MapClusterLayer, which draws its
 * own circle layers and cannot host an HTML marker. Adopting it would have cost
 * the icon-for-type, colour-for-status encoding — the thing that makes this map
 * readable at a glance — to solve a crowding problem. Twenty lines of grouping
 * is the cheaper trade.
 *
 * Clustering is in screen space, not in metres: two pins a block apart overlap
 * at city zoom and are comfortably separate at street zoom, and it is the
 * overlap that matters.
 *
 * Recomputed on zoom only. Panning moves every pin by the same offset, so the
 * pixel distances between them never change — recomputing on "move" would run
 * this sixty times a second to produce an identical answer.
 */
export function useClusters(sites: SiteDTO[], radius = 42): Cluster[] {
  const { map } = useMap();
  const [zoomTick, setZoomTick] = useState(0);

  useEffect(() => {
    if (!map) return;
    const bump = () => setZoomTick((n) => n + 1);
    map.on("zoomend", bump);
    return () => {
      map.off("zoomend", bump);
    };
  }, [map]);

  return useMemo(() => {
    const single = (site: SiteDTO): Cluster => ({
      key: site.id,
      sites: [site],
      longitude: site.longitude,
      latitude: site.latitude,
    });

    if (!map) return sites.map(single);

    const projected = sites.map((site) => ({
      site,
      point: map.project([site.longitude, site.latitude]),
    }));

    const taken = new Set<string>();
    const clusters: Cluster[] = [];

    for (const anchor of projected) {
      if (taken.has(anchor.site.id)) continue;
      taken.add(anchor.site.id);

      const group = [anchor.site];
      for (const other of projected) {
        if (taken.has(other.site.id)) continue;
        const distance = Math.hypot(
          anchor.point.x - other.point.x,
          anchor.point.y - other.point.y,
        );
        if (distance <= radius) {
          taken.add(other.site.id);
          group.push(other.site);
        }
      }

      if (group.length === 1) {
        clusters.push(single(group[0]));
        continue;
      }

      clusters.push({
        // Keyed by members so React reuses nothing across a regrouping; a
        // cluster that gains a pin is a different object, not a mutated one.
        key: group
          .map((s) => s.id)
          .sort()
          .join("~"),
        sites: group,
        longitude:
          group.reduce((sum, s) => sum + s.longitude, 0) / group.length,
        latitude: group.reduce((sum, s) => sum + s.latitude, 0) / group.length,
      });
    }

    return clusters;
    // zoomTick is the dependency that matters: it is what changes when the
    // pixel geometry does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sites, radius, zoomTick]);
}
