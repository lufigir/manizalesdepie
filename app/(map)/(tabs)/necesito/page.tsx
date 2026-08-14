import type { Metadata } from "next";

import { SitePanel } from "../../_components/site-panel";

export const metadata: Metadata = {
  title: "Necesito",
  description:
    "Albergues, puntos de censo y entrega de ayudas en Manizales y Villamaría.",
};

/**
 * The section for someone who was hit by the earthquake, not for someone who
 * came to help. A request is written here and read in "Ayudar": one map, one
 * question, and neither audience has to read past the other's screen.
 */
export default function NeedPage() {
  return <SitePanel />;
}
