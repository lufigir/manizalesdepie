import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Necesito",
  description:
    "Albergues, puntos de censo y entrega de ayudas en Manizales y Villamaría.",
};

/**
 * The section for someone who was hit by the earthquake, not for someone who
 * came to help. See `HelpPage` for why this route renders nothing itself —
 * it only seeds "Necesito" as the filter `UnifiedPanel` opens on.
 */
export default function NeedPage() {
  return null;
}
