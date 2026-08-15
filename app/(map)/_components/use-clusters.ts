"use client";

import { useEffect, useMemo, useState } from "react";

import { useMap } from "@/components/ui/map";

type Located = { id: string; longitude: number; latitude: number };

export type Cluster<T> = {
  key: string;
  items: T[];
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
 * Generic over `T` rather than tied to `SiteDTO`: sites were the first pins
 * dense enough to need this, but resource offers cluster just as hard — several
 * can share the exact same point, a barrio's own centroid — and giving each
 * family its own copy of this hook would drift the two apart for no reason.
 * Clustering stays PER FAMILY on purpose (a site is never grouped with an
 * offer): the cluster badge collapses into one shape, and mixing shapes would
 * break the one rule that says what kind of thing a pin is before its icon or
 * colour has been read.
 *
 * Clustering is in screen space, not in metres: two pins a block apart overlap
 * at city zoom and are comfortably separate at street zoom, and it is the
 * overlap that matters.
 *
 * Recomputed on zoom only. Panning moves every pin by the same offset, so the
 * pixel distances between them never change — recomputing on "move" would run
 * this sixty times a second to produce an identical answer.
 */
export function useClusters<T extends Located>(
  items: T[],
  radius = 42,
): Cluster<T>[] {
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
    const single = (item: T): Cluster<T> => ({
      key: item.id,
      items: [item],
      longitude: item.longitude,
      latitude: item.latitude,
    });

    if (!map) return items.map(single);

    const projected = items.map((item) => ({
      item,
      point: map.project([item.longitude, item.latitude]),
    }));

    const taken = new Set<string>();
    const clusters: Cluster<T>[] = [];

    for (const anchor of projected) {
      if (taken.has(anchor.item.id)) continue;
      taken.add(anchor.item.id);

      const group = [anchor.item];
      for (const other of projected) {
        if (taken.has(other.item.id)) continue;
        const distance = Math.hypot(
          anchor.point.x - other.point.x,
          anchor.point.y - other.point.y,
        );
        if (distance <= radius) {
          taken.add(other.item.id);
          group.push(other.item);
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
          .map((i) => i.id)
          .sort()
          .join("~"),
        items: group,
        longitude:
          group.reduce((sum, i) => sum + i.longitude, 0) / group.length,
        latitude: group.reduce((sum, i) => sum + i.latitude, 0) / group.length,
      });
    }

    return clusters;
    // zoomTick is the dependency that matters: it is what changes when the
    // pixel geometry does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, items, radius, zoomTick]);
}
