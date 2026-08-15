import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mascotas",
  description:
    "Animales perdidos, encontrados y avistados tras el sismo en Manizales y Villamaría.",
};

/**
 * See `HelpPage` for why this route renders nothing itself — it only seeds
 * "Mascotas" as the filter `UnifiedPanel` opens on.
 */
export default function PetsPage() {
  return null;
}
