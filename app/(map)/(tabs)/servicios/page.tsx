import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Volqueta, carro, herramienta, bodega, transporte y hogar de paso ofrecidos por la ciudad.",
};

/**
 * See `HelpPage` for why this route renders nothing itself — it only seeds
 * "Servicios" as the filter `UnifiedPanel` opens on.
 */
export default function ServicesPage() {
  return null;
}
