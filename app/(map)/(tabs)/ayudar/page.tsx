import type { Metadata } from "next";

import { SitePanel } from "../../_components/site-panel";

export const metadata: Metadata = {
  title: "Ayudar",
  description:
    "Dónde ayudar hoy en Manizales y Villamaría: acopios, donación de sangre y jornadas.",
};

/**
 * The default section, and the app's answer to "¿dónde ayudo hoy?".
 *
 * Most people who open this map are about to give something — time, a car, a
 * bag of groceries — so this is what "/" redirects to.
 */
export default function HelpPage() {
  return <SitePanel />;
}
