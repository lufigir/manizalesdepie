import type { Metadata } from "next";

import { getCurrentUser } from "@/data/user/require-user";

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
export default async function HelpPage() {
  // Only the work-order block reads this — reclaiming a case is a sign-in,
  // same reasoning as convening a jornada. Resolved here and handed down as
  // a boolean, the same pattern reportar/jornada uses.
  const user = await getCurrentUser();
  return <SitePanel signedIn={user !== null} />;
}
