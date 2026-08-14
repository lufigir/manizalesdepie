import type { Metadata } from "next";

import { AnimalPanel } from "../../_components/animal-panel";

export const metadata: Metadata = {
  title: "Mascotas",
  description:
    "Animales perdidos, encontrados y avistados tras el sismo en Manizales y Villamaría.",
};

/**
 * The one section where the map is not the product: you recognise a dog by its
 * face, so the photographs get the space and the map shrinks to a reference.
 */
export default function PetsPage() {
  return <AnimalPanel />;
}
