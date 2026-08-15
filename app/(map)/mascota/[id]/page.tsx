import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { CallDAL } from "@/data/call/call.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { clientEnv } from "@/lib/env";
import { ANIMAL_LABEL, OG_LABEL, freshness } from "@/lib/labels";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared animal report.
 *
 * The one link on this map that circulates on its own merits. "¿Han visto a
 * este perro?" is already the most forwarded message in every barrio group in
 * the city, and it always arrives as a photo with no way back to whoever sent
 * it — the phone number is in a message forty messages up the thread, or it
 * was never there at all. This link carries the photo, the barrio, when it
 * was last seen, and the WhatsApp of the person who reported it.
 *
 * The map opens on the sighting when there is one, and stays where it is when
 * there is not. Most reports have no coordinate: a lost animal has no
 * location, which is what lost means.
 */

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const animal = await AnimalDAL.public().findById(id);

  if (!animal) return { title: OG_LABEL.notFound };

  const { label: freshLabel } = freshness(animal.lastSeenAt);
  const title = `${animal.petName ?? ANIMAL_LABEL[animal.species]} · ${
    animal.resolvedAt ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]
  }`;
  const description = [
    animal.description,
    animal.zone,
    `${ANIMAL_LABEL.seenAt} ${freshLabel.replace(/^Confirmado /, "")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/mascota/${animal.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedAnimalPage({ params }: Params) {
  const { id } = await params;

  const [animal, animals, sites, calls, neighborhoodStatuses, user] =
    await Promise.all([
      AnimalDAL.public().findById(id),
      AnimalDAL.public().listPublished(),
      SiteDAL.public().listPublished(),
      CallDAL.public().listPublished(),
      NeighborhoodDAL.public().statuses(),
      getCurrentUser(),
    ]);

  if (!animal) notFound();

  // A hidden report is not in the list; adding it back keeps the card from
  // opening onto nothing, the same way every other shared route does.
  const withShared = animals.some((row) => row.id === animal.id)
    ? animals
    : [animal, ...animals];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        calls={calls}
        animals={withShared}
        neighborhoodStatuses={neighborhoodStatuses}
        initialSelectedId={animal.id}
        tab="pets"
        isAdmin={user?.role === "curator"}
      />
    </main>
  );
}
