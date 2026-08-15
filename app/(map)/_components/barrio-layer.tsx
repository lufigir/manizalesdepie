"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FilterSpecification } from "maplibre-gl";

import { MapGeoJSON, useMap } from "@/components/ui/map";
import type { NeighborhoodStatusDTO } from "@/data/neighborhood/neighborhood.dto";
import { contains } from "@/lib/geo";

/**
 * The barrios of Manizales and Villamaría, as areas to hover and to stand in.
 *
 * These replaced the comunas because a comuna is not how anyone here describes
 * where they are. Nobody says "estoy en la Comuna 4"; they say "estoy en
 * Chipre". An outline the reader cannot name is not orientation.
 *
 * The borders are the official ones: SIG Alcaldía de Manizales publishes them
 * as "Límite de barrios", the division set by Acuerdo Municipal 589 de 2004.
 * `scripts/fetch-barrios.mjs` fetches, simplifies and commits them, and carries
 * each barrio's comuna along, so aggregating up to comuna later needs no second
 * source.
 *
 * Villamaría has no equivalent dataset, so across the river the indicator
 * reports nothing. That is deliberate: a name we cannot source is worse here
 * than no name.
 */

/**
 * Normalises any CSS colour to plain `rgba()`.
 *
 * This is not decoration. The palette is authored in `oklch()`, and
 * getComputedStyle hands that back resolved to `lab()`, which MapLibre's style
 * parser rejects outright — "color expected, lab(...) found" — taking the whole
 * layer down with it. Painting one pixel and reading it back makes the browser
 * do the conversion, and it works for any colour space it supports, including
 * whatever the palette is written in next.
 */
function toRgba(color: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);

  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

/**
 * MapLibre paint properties take real CSS colours, not Tailwind classes, so the
 * project's "no literal colours in components" rule cannot be met by a class
 * here. Reading the token off the document keeps the palette where the rule
 * wants it — defined once in globals.css — instead of hardcoding a hex.
 */
function useToken(name: string): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      setValue(raw ? toRgba(raw) : null);
    };

    read();

    // The theme toggle swaps the class on <html>, which changes what the token
    // resolves to; without this the borders keep the previous theme's colour.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [name]);

  return value;
}

export type BarrioProps = {
  id: string;
  name: string;
  comuna: string | null;
  /** Where the label is drawn. Precomputed by scripts/fetch-barrios.mjs. */
  lon: number;
  lat: number;
};
type BarrioFeature = {
  properties: BarrioProps;
  geometry: Parameters<typeof contains>[0];
};
type Barrios = { type: "FeatureCollection"; features: BarrioFeature[] };

export function BarrioLayer({
  onCentreChange,
  onHoverChange,
  selected,
  onSelect,
  statuses = [],
}: {
  /** Which barrio the map is centred on. Reported continuously, unlike the
   *  hover, which needs a cursor and therefore does not exist on a phone. */
  onCentreChange?: (name: string | null) => void;
  /** Which barrio the cursor is over, or null. Reported UP rather than drawn
   *  here: the answer belongs in the chip beside the clock, which already
   *  exists, already says a barrio name, and does not cover the map. */
  onHoverChange?: (name: string | null) => void;
  /** The barrio being filtered by, drawn solid so the filter is visible on the
   *  map and not only in the list. */
  selected?: string | null;
  /** Tapping a barrio filters by it; tapping it again clears the filter. */
  onSelect?: (barrio: BarrioProps | null) => void;
  /** Barrios with an evacuation/utility status on record. The only shading
   *  this layer carries besides the uniform wash and the selection: a real
   *  severity signal, unlike a choropleth of unmet need, which needs work
   *  orders that do not exist yet. */
  statuses?: NeighborhoodStatusDTO[];
}) {
  const { map } = useMap();
  // --foreground rather than a fixed grey: it is light on the dark basemap and
  // dark on the light one, so the outline keeps contrast in both themes. A grey
  // token disappeared into the basemap's own road lines.
  const border = useToken("--foreground");
  // The label's halo: the page background, so the name stays readable over the
  // basemap in either theme without inventing a colour.
  const halo = useToken("--background");
  // Same vocabulary as a site card: unclaimed = needs eyes on it, claimed = in
  // progress / partially affected.
  const evacuatedColor = useToken("--unclaimed");
  const utilityColor = useToken("--claimed");
  const [data, setData] = useState<Barrios | null>(null);

  const evacuatedNames = useMemo(
    () => statuses.filter((s) => s.evacuated).map((s) => s.name),
    [statuses],
  );
  // Evacuation already says "look here"; a barrio does not need the utility
  // shade on top of it, so this excludes anything already in `evacuatedNames`.
  const utilityNames = useMemo(
    () =>
      statuses
        .filter(
          (s) =>
            !s.evacuated &&
            (s.gasStatus === "suspended" ||
              s.powerStatus === "suspended" ||
              s.waterStatus === "suspended"),
        )
        .map((s) => s.name),
    [statuses],
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/barrios.geojson")
      .then((res) => res.json())
      .then((collection: Barrios) => {
        if (!cancelled) setData(collection);
      })
      .catch(() => {
        // The outline is orientation, not information. If it fails to load the
        // map is still entirely usable, so this stays silent.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map || !data || !onCentreChange) return;

    const report = () => {
      const { lng, lat } = map.getCenter();
      const found = data.features.find((f) => contains(f.geometry, lng, lat));
      onCentreChange(found?.properties.name ?? null);
    };

    report();
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [map, data, onCentreChange]);

  /**
   * Which barrio the cursor is in, handed straight up.
   *
   * This used to drive a label pinned to the cursor, which needed a
   * `mousemove` listener of its own to stop the name from sticking where the
   * pointer first crossed the boundary. The label is gone: a chip that
   * follows the cursor covers the map it is describing, and the corner beside
   * the clock was already saying a barrio name — two answers to "¿dónde
   * estoy?" on screen at once, one of them in the way.
   *
   * mapcn's `onHover` fires only when the hovered feature CHANGES, which is
   * exactly the right granularity now that nothing tracks the pointer.
   */
  const handleHover = useCallback(
    (event: { feature: { properties: BarrioProps } } | null) => {
      onHoverChange?.(event?.feature.properties.name ?? null);
    },
    [onHoverChange],
  );

  const handleClick = useCallback(
    (event: { feature: { properties: BarrioProps } }) => {
      const barrio = event.feature.properties;

      if (barrio.name === selected) {
        onSelect?.(null);
        return;
      }

      onSelect?.(barrio);

      /**
       * Flying to the barrio IS the focus. The pins of every other barrio stay
       * drawn — the map is how someone finds out the nearest acopio is one
       * barrio over — so the camera is what says "this one", together with the
       * solid wash and the panel.
       *
       * The bounds come from the loaded collection rather than from the click
       * event: MapLibre hands back tile-clipped geometry for a feature that
       * crosses a tile edge, which would fit the camera to a fragment.
       */
      const feature = data?.features.find((f) => f.properties.id === barrio.id);
      if (!map || !feature) return;

      const rings =
        feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates
          : feature.geometry.coordinates.flat();

      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;

      for (const ring of rings) {
        for (const [lon, lat] of ring) {
          if (lon < west) west = lon;
          if (lon > east) east = lon;
          if (lat < south) south = lat;
          if (lat > north) north = lat;
        }
      }

      if (west === Infinity) return;

      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        // Padding so the barrio does not end up under the clock/barrio chip
        // at the top or the report button at the bottom.
        { padding: { top: 96, bottom: 72, left: 40, right: 40 }, maxZoom: 16 },
      );
    },
    [onSelect, selected, data, map],
  );

  /**
   * The names, written on the map itself.
   *
   * A separate source and a symbol layer built by hand, because MapGeoJSON only
   * renders fill and outline. It also has to be its own source: labelling the
   * polygons would let MapLibre place a name wherever a shape happens to be
   * widest, and these centroids are already computed.
   *
   * From zoom 14 up only. Any earlier and 114 names fight the pins for the same
   * pixels; this is the zoom at which someone has stopped scanning the city and
   * started reading a neighbourhood. It is also the version of this that works
   * on a phone, where there is no cursor to hover with.
   */
  useEffect(() => {
    if (!map || !data || !border) return;

    const sourceId = "barrio-labels";
    const layerId = "barrio-labels-layer";

    /**
     * CARTO's basemap labels barrios too, and its names are not ours: they come
     * from OSM, they are placed by the tile server and they do not know which
     * barrio is being filtered by. Two sets of names on one map is just noise,
     * so the basemap's are hidden while ours are on, and restored on the way
     * out — the style belongs to the map, not to this component.
     *
     * This has to key off the OpenMapTiles `class` property, not the layer id:
     * CARTO's own style buckets `class: "neighbourhood"` into a layer called
     * `place_hamlet`, shared with `class: "hamlet"` (an actual small rural
     * settlement, not a barrio). Matching the id against /neighbourhood/ never
     * matched that layer at all — the id itself says nothing about which
     * classes it draws. Patching the filter on every symbol layer sourced from
     * `place` is the only way to remove exactly the classes that mean "barrio"
     * without also removing classes that share their layer by coincidence.
     */
    const patched: { id: string; filter: FilterSpecification | null }[] = [];
    const BARRIO_LIKE_CLASSES = ["suburb", "neighbourhood", "quarter"];

    const hideBasemapNames = () => {
      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.type !== "symbol" || layer["source-layer"] !== "place") continue;
        if (patched.some((p) => p.id === layer.id)) continue;

        const original = (layer.filter as FilterSpecification | undefined) ?? null;
        patched.push({ id: layer.id, filter: original });
        map.setFilter(layer.id, [
          "all",
          ...(original ? [original] : []),
          ["!in", "class", ...BARRIO_LIKE_CLASSES],
        ] as FilterSpecification);
      }
    };

    const add = () => {
      /**
       * `<Map>` renders children as soon as the MapLibre instance exists
       * (`{mapInstance && children}` — it does not wait for the style),
       * so this can run before the style has finished loading. Every
       * style-mutating call below throws "Style is not done loading" in
       * that window. Bailing out here is safe: "styledata" keeps firing
       * while the style loads, and `add` is bound to it below, so this
       * retries on its own the moment the style is actually ready.
       */
      if (!map.isStyleLoaded()) return;

      hideBasemapNames();
      if (map.getLayer(layerId)) return;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: data.features.map((f) => ({
              type: "Feature" as const,
              properties: { name: f.properties.name },
              geometry: {
                type: "Point" as const,
                coordinates: [f.properties.lon, f.properties.lat],
              },
            })),
          },
        });
      }

      map.addLayer({
        id: layerId,
        type: "symbol",
        source: sourceId,
        minzoom: 14,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-font": ["Noto Sans Regular"],
          "text-max-width": 8,
          // Never overlap a name onto another name, and let MapLibre drop the
          // ones that do not fit: a legible half is worth more than a soup.
          "text-allow-overlap": false,
          "text-padding": 6,
        },
        paint: {
          "text-color": border,
          "text-halo-color": halo ?? "rgba(255,255,255,0.9)",
          "text-halo-width": 1.4,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.6, 0.85],
        },
      });
    };

    add();
    // A style reload (theme switch) drops custom layers; this puts them back.
    map.on("styledata", add);

    return () => {
      map.off("styledata", add);

      /**
       * The map may already be destroyed by the time we get here.
       *
       * `<Map>` owns the MapLibre instance and calls `map.remove()` in its own
       * cleanup — and React tears a deleted subtree down PARENT FIRST, so on any
       * navigation away from the map that runs before this. `remove()` does
       * `setStyle(null)`, and every layer question below then reaches into a
       * style that is gone: `getLayer` throws inside MapLibre rather than
       * returning undefined.
       *
       * Bailing out is not merely defensive, it is correct: a removed map took
       * its sources and layers with it, and the basemap labels this effect hid
       * went with the style. There is nothing left to restore.
       */
      if (!map.style) return;

      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      for (const { id, filter } of patched) {
        if (map.getLayer(id)) map.setFilter(id, filter);
      }
    };
  }, [map, data, border, halo]);

  // Skip the first paint rather than flash a wrong colour: the token is only
  // readable once the stylesheet has applied.
  if (!border || !data || !evacuatedColor || !utilityColor) return null;

  return (
    <>
      <MapGeoJSON<BarrioProps>
        data={data as never}
        id="barrios"
        promoteId="id"
        /* Barely-there by default — deliberately uniform, so an ordinary barrio
           cannot be mistaken for a choropleth of unmet need, which needs work
           orders that do not exist yet.
           Two named exceptions ride the same fill: a barrio with an official
           evacuation, and one with a suspended utility. That is real severity a
           utility or the Alcaldía actually reported, not an inference this app
           is making — so it earns colour where nothing else on this layer does.
           It is not decoration either. mapcn binds hover to the fill layer and
           bails out entirely when there is none (`if (!interactive || !showFill)
           return`), so without a fill there is no highlight at all — a 1.5px
           dashed line is not something anyone can point at. */
        fillPaint={{
          "fill-color": [
            "case",
            ["in", ["get", "name"], ["literal", evacuatedNames]],
            evacuatedColor,
            ["in", ["get", "name"], ["literal", utilityNames]],
            utilityColor,
            border,
          ],
          // The one being filtered by is drawn solid, so the filter is visible
          // on the map and not only as a chip in the corner. A status barrio
          // gets a floor above the uniform wash even unselected, so the signal
          // survives closing the filter.
          "fill-opacity": [
            "case",
            ["==", ["get", "name"], selected ?? ""],
            0.22,
            ["in", ["get", "name"], ["literal", evacuatedNames]],
            0.16,
            ["in", ["get", "name"], ["literal", utilityNames]],
            0.1,
            selected ? 0.02 : 0.03,
          ],
        }}
        fillHoverPaint={{ "fill-opacity": 0.12 }}
        linePaint={{
          "line-color": border,
          "line-width": selected
            ? ["case", ["==", ["get", "name"], selected], 2.5, 1.4]
            : 1.75,
          // Raised from 0.28: against the dark basemap — the one most
          // people actually see this on — a near-white line at that
          // opacity read as barely stronger than the basemap's own road
          // lines. The fill stays deliberately faint (see above); the line
          // is the one thing that has to read as a boundary on its own.
          "line-opacity": 0.42,
          "line-dasharray": [3, 2],
        }}
        onClick={handleClick}
        onHover={handleHover}
        /* Interactive drives both the highlight and onHover. mapcn binds them
           to the fill layer and skips them entirely when this is false. */
        interactive
      />
    </>
  );
}
