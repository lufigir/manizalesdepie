import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¿Dónde ayudo hoy?",
  description:
    "Mapa vivo de la ayuda en Manizales y Villamaría: acopios, albergues, donación de sangre, grupos y necesidades.",
};

/**
 * The map itself, at `/`.
 *
 * `(tabs)` is a route group, so it adds no segment — this file IS the root,
 * and it inherits the layout that loads every family and renders
 * `MapWorkspace`. Nothing to render of its own, for the same reason the three
 * remaining section routes render nothing: the map is unified, and
 * `UnifiedPanel` reads the active filter from the workspace rather than from
 * whichever page happened to mount it. With no segment to read,
 * `tabFromSegment` falls back to "Ayudar", which seeds the "Todo" chip — the
 * right thing to open on at the bare domain.
 *
 * This replaced a `/` that redirected to `/ayudar`. That redirect made the
 * main map a URL nobody would guess, cost a hop on every visit including the
 * "Ver todo el mapa" chip, and pointed at a section that seeded the exact
 * same chip this does. `/ayudar` is gone rather than kept as an alias: it was
 * a second address for one screen.
 */
export default function MapPage() {
  return null;
}
