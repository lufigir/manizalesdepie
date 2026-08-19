import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¿Dónde ayudo hoy?",
  description:
    "Mapa vivo de la ayuda en Manizales y Villamaría: necesidades, acopios, albergues y donación de sangre.",
};

/**
 * The map itself, at `/` — the only route under `(tabs)`.
 *
 * `(tabs)` is a route group, so it adds no segment — this file IS the root,
 * and it inherits the layout that loads every family and renders
 * `MapWorkspace` with no `tab` prop. `MapWorkspace` seeds `DEFAULT_TAB_ID`
 * ("help") whenever no `tab` is forced, which opens on the "Todo" chip — the
 * right thing to show at the bare domain. `UnifiedPanel` reads and changes
 * the active filter from there afterwards; this page has nothing else to do.
 */
export default function MapPage() {
  return null;
}
