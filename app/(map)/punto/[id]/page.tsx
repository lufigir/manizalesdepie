import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/current-user";
import { SITE_URL } from "@/lib/env";
import { SITE_STATUS_LABEL, SITE_TYPE_LABEL, confidence } from "@/lib/labels";
import { SITE_TYPE_TAB } from "@/lib/tabs";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared pin.
 *
 * This route exists because of one line that repeats in every relief WhatsApp
 * group in the city: "¿Por dónde queda exactamente?". Someone posts a photo
 * asking for help, four people ask where, and eventually one of them pastes raw
 * Google Maps coordinates. This is that question answered with a link.
 *
 * It renders the same map, opened on the pin, so a shared link never lands
 * anyone somewhere they then have to navigate out of.
 */

type Params = { params: Promise<{ id: string }> };

/**
 * The OpenGraph block is the point of the separate route: WhatsApp unfurls it
 * into a card, so the name, the neighbourhood and whether the place is open are
 * legible in the group thread before anyone taps anything.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const site = await SiteDAL.public().findById(id);

  if (!site) return { title: "Punto no encontrado" };

  const { label: confidenceLabel } = confidence(site);
  const description = [
    SITE_TYPE_LABEL[site.type],
    site.neighborhood,
    SITE_STATUS_LABEL[site.status],
    confidenceLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: site.name,
    description,
    openGraph: {
      title: site.name,
      description,
      url: `${SITE_URL}/punto/${site.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedSitePage({ params }: Params) {
  const { id } = await params;

  const [site, sites, animals, user] = await Promise.all([
    SiteDAL.public().findById(id),
    SiteDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    getCurrentUser(),
  ]);

  if (!site) notFound();

  // The shared pin may be unpublished — a curator's link, say — in which case
  // it is not in the list. Adding it keeps the card from opening onto nothing.
  const withShared = sites.some((s) => s.id === site.id)
    ? sites
    : [site, ...sites];

  // The section is a property of the pin that was shared, not of the route, so
  // it is passed in rather than read off the URL.
  const tab = SITE_TYPE_TAB[site.type];

  return (
    <main className="h-full w-full overflow-hidden">
      <MapWorkspace
        sites={withShared}
        animals={animals}
        initialSelectedId={site.id}
        tab={tab}
        user={user}
      />
    </main>
  );
}
