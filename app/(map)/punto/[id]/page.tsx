import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { loadWorkspaceData } from "@/data/workspace/load-workspace-data";
import { clientEnv } from "@/lib/env";
import { SITE_STATUS_LABEL, SITE_TYPE_LABEL, confidence } from "@/lib/labels";
import { SITE_TYPE_TAB } from "@/lib/tabs";
import { parseBarrioParam } from "@/lib/workspace-search-params";

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

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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
      url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/punto/${site.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedSitePage({ params, searchParams }: Params) {
  const { id } = await params;

  const [site, workspace, user, rawSearchParams] = await Promise.all([
    SiteDAL.public().findById(id),
    loadWorkspaceData(),
    getCurrentUser(),
    searchParams,
  ]);

  if (!site) notFound();

  // The shared pin may be unpublished — a curator's link, say — in which case
  // it is not in the list. Adding it keeps the card from opening onto nothing.
  const sites = workspace.sites.some((s) => s.id === site.id)
    ? workspace.sites
    : [site, ...workspace.sites];

  // The section is a property of the pin that was shared, not of the route, so
  // it is passed in rather than read off the URL.
  const tab = SITE_TYPE_TAB[site.type];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        animals={workspace.animals}
        services={workspace.services}
        needs={workspace.needs}
        barrios={workspace.barrios}
        initialSelectedId={site.id}
        initialBarrioName={parseBarrioParam(rawSearchParams)}
        tab={tab}
        user={user}
      />
    </main>
  );
}
