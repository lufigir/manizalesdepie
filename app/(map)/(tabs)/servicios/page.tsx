import type { Metadata } from "next";

import { ServicesPanel } from "../../_components/services-panel";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Volqueta, carro, herramienta, bodega, transporte y hogar de paso ofrecidos por la ciudad.",
};

export default function ServicesPage() {
  return <ServicesPanel />;
}
