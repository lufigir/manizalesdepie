import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ayudar",
  description:
    "Dónde ayudar hoy en Manizales y Villamaría: acopios, donación de sangre y grupos.",
};

/**
 * The default section, and the app's answer to "¿dónde ayudo hoy?" — so it is
 * what "/" redirects to.
 *
 * There is nothing to render here any more: the map is unified now (see
 * `MapWorkspace`), and `UnifiedPanel` reads which filter is active straight
 * from the workspace instead of from which page happened to render it. This
 * route exists so `/ayudar` stays a real, shareable URL and seeds "Ayudar" as
 * the filter that opens — see `tabFromSegment` in `MapWorkspace`.
 */
export default function HelpPage() {
  return null;
}
