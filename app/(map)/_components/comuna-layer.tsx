"use client";

import { useEffect, useState } from "react";

import { MapGeoJSON } from "@/components/ui/map";
import type { SiteDTO, SiteType } from "@/data/site/site.dto";
import { contains } from "@/lib/geo";

/**
 * The 12 comunas of Manizales plus its rural corregimientos, as outlines.
 *
 * Why comunas and not barrios: barrio polygons do not exist in any open
 * source. The Alcaldía's own "División por comunas y barrios" dataset is a CSV
 * with no geometry, and OSM carries no barrio areas here. Comuna is also the
 * unit the Alcaldía actually administers, and aggregating to it is more private
 * than a pin — which is the direction the data-protection guidance pushes.
 *
 * Outlines only for now. The fill is meant to carry unmet need per comuna, and
 * that number comes from unclaimed work orders, which do not exist yet. Drawing
 * a shade over an empty dataset would invent a fact.
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

type ComunaProps = { id: number; name: string; urban: boolean };
type ComunaFeature = {
  properties: ComunaProps;
  geometry: Parameters<typeof contains>[0];
};
type Comunas = { type: "FeatureCollection"; features: ComunaFeature[] };

/** What the tooltip says about the comuna under the cursor. */
export type ComunaHover = {
  name: string;
  total: number;
  open: number;
  byType: { type: SiteType; count: number }[];
  x: number;
  y: number;
};

export function ComunaLayer({
  sites,
  onHover,
}: {
  sites: SiteDTO[];
  onHover?: (hover: ComunaHover | null) => void;
}) {
  // --foreground rather than a fixed grey: it is light on the dark basemap and
  // dark on the light one, so the outline keeps contrast in both themes. A grey
  // token disappeared into the basemap's own road lines.
  const border = useToken("--foreground");
  const [data, setData] = useState<Comunas | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/comunas.geojson")
      .then((res) => res.json())
      .then((collection: Comunas) => {
        if (cancelled) return;
        // Only the 12 urban comunas. The rural corregimientos are enormous —
        // they sprawl across the whole viewport and read as noise rather than
        // as the city's divisions, which is the opposite of orienting someone.
        setData({
          ...collection,
          features: collection.features.filter((f) => f.properties.urban),
        });
      })
      .catch(() => {
        // The outline is orientation, not information. If it fails to load the
        // map is still entirely usable, so this stays silent.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Skip the first paint rather than flash a wrong colour: the token is only
  // readable once the stylesheet has applied.
  if (!border || !data) return null;

  return (
    <MapGeoJSON<ComunaProps>
      data={data as never}
      id="comunas"
      promoteId="id"
      /* A uniform, barely-there fill — deliberately uniform, so it cannot be
         mistaken for a choropleth: every comuna gets the same wash regardless
         of what is inside it.
         It is not decoration. mapcn binds hover to the fill layer and bails out
         entirely when there is none (`if (!interactive || !showFill) return`),
         so without a fill there is no tooltip at all — a 1.5px dashed line is
         not something anyone can point at. It also makes each comuna read as an
         area rather than as stray lines among the basemap's own roads. */
      fillPaint={{ "fill-color": border, "fill-opacity": 0.03 }}
      fillHoverPaint={{ "fill-opacity": 0.12 }}
      linePaint={{
        "line-color": border,
        "line-width": 1.5,
        "line-opacity": 0.35,
        "line-dasharray": [3, 2],
      }}
      interactive={Boolean(onHover)}
      onHover={(event) => {
        if (!onHover) return;
        if (!event) {
          onHover(null);
          return;
        }

        // The hovered feature comes back from MapLibre with its geometry
        // stripped down, so the count is taken against the source collection
        // we loaded rather than against the event payload.
        const { id, name } = event.feature.properties;
        const feature = data.features.find((f) => f.properties.id === id);
        const inside = feature
          ? sites.filter((site) =>
              contains(feature.geometry, site.longitude, site.latitude),
            )
          : [];

        const counts = new Map<SiteType, number>();
        for (const site of inside) {
          counts.set(site.type, (counts.get(site.type) ?? 0) + 1);
        }

        onHover({
          name,
          total: inside.length,
          open: inside.filter((site) => site.status === "open").length,
          byType: [...counts.entries()]
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count),
          x: event.originalEvent.point.x,
          y: event.originalEvent.point.y,
        });
      }}
    />
  );
}
