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

export type SpreadPin<T> = {
  item: T;
  /** Where to anchor the `MapMarker` — the item's own coordinate when it is
   *  alone, the shared centroid of its whole group otherwise. */
  longitude: number;
  latitude: number;
  /** Pixel nudge away from that anchor, `0` for an unclustered pin. Applied
   *  as a CSS `translate`, never as a fake coordinate — see the note on
   *  `useSpreadPins`. */
  offsetX: number;
  offsetY: number;
};

/**
 * Every pin, individually — never a count badge.
 *
 * `useClusters` still does the grouping (it answers "which pins overlap on
 * screen"); this answers the next question, "so where do I actually draw
 * each one". A group's members are pushed onto a ring around its centroid
 * with a CSS transform, in pixels, exactly the way the old fan-out-on-tap
 * used to — the only change is that the ring is now what always renders,
 * instead of a number a reader had to tap through first. Each member still
 * carries its own icon and is still its own tap target.
 *
 * A ring, not a grid: it scales to any count without needing a second layout
 * rule, and it is the shape a reader's eye already parses as "a pile of
 * things", the same read a real pile of pins on a table would give.
 */
export function useSpreadPins<T extends Located>(
  items: T[],
  radius = 42,
): SpreadPin<T>[] {
  const clusters = useClusters(items, radius);

  return useMemo(() => {
    const pins: SpreadPin<T>[] = [];

    for (const cluster of clusters) {
      if (cluster.items.length === 1) {
        const item = cluster.items[0];
        pins.push({
          item,
          longitude: item.longitude,
          latitude: item.latitude,
          offsetX: 0,
          offsetY: 0,
        });
        continue;
      }

      const count = cluster.items.length;
      // Grows with the count so a handful of pins do not overlap each other
      // on the ring, capped so a large group does not fan out past the
      // radius `useClusters` used to group them in the first place.
      const spreadRadius = Math.max(24, Math.min(58, 9 * count));

      cluster.items.forEach((item, index) => {
        // Start at twelve o'clock so the first pin is never hidden behind a
        // popup, which opens above the marker.
        const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
        pins.push({
          item,
          longitude: cluster.longitude,
          latitude: cluster.latitude,
          offsetX: Math.cos(angle) * spreadRadius,
          offsetY: Math.sin(angle) * spreadRadius,
        });
      });
    }

    return pins;
  }, [clusters]);
}
