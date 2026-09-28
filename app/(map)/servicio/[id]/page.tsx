import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceDAL } from "@/data/service/service.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { loadWorkspaceData } from "@/data/workspace/load-workspace-data";
import { clientEnv } from "@/lib/env";
import {
  OG_LABEL,
  SERVICE_TYPE_LABEL,
  SERVICES_LABEL,
} from "@/lib/labels";
import { parseBarrioParam } from "@/lib/workspace-search-params";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared service offer.
 *
 * The same job the other four `[id]` routes do, for the half of this map that
 * is people offering rather than asking. "Alguien tiene una volqueta?" gets
 * answered in a group with a screenshot of a screenshot; this is that answer
 * with the type, the barrio, the hours and a number that is one tap away.
 *
 * Most services have no exact point — a truck that can drive anywhere in the
 * city is a barrio-level fact — so the map often opens where it already was,
 * with the card up. That is correct: the card, not the pin, is the answer
 * here.
 */

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const service = await ServiceDAL.public().findById(id);

  if (!service) return { title: OG_LABEL.notFound };

  const title = SERVICE_TYPE_LABEL[service.type];
  const description = [
    service.description,
    service.neighborhood ?? service.area ?? SERVICES_LABEL.cityWide,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/servicio/${service.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedServicePage({
  params,
  searchParams,
}: Params) {
  const { id } = await params;

  const [service, workspace, user, rawSearchParams] = await Promise.all([
    ServiceDAL.public().findById(id),
    loadWorkspaceData(),
    getCurrentUser(),
    searchParams,
  ]);

  if (!service) notFound();

  // A link outlives the week a service is published for: `listPublished`
  // drops it once `expires_at` passes, so the shared one is added back
  // rather than opening onto an empty map. The card says how stale it is.
  const services = workspace.services.some((row) => row.id === service.id)
    ? workspace.services
    : [service, ...workspace.services];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={workspace.sites}
        services={services}
        needs={workspace.needs}
        animals={workspace.animals}
        barrios={workspace.barrios}
        initialSelectedId={service.id}
        initialBarrioName={parseBarrioParam(rawSearchParams)}
        tab="services"
        user={user}
      />
    </main>
  );
}
