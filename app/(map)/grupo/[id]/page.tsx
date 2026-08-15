import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { CallDAL } from "@/data/call/call.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { clientEnv } from "@/lib/env";
import {
  CALL_CATEGORY_LABEL,
  CALL_STATE_LABEL,
  callState,
} from "@/lib/labels";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared grupo.
 *
 * This is the route the whole feature is built around. What circulates in a
 * WhatsApp thread is a line of text that always loses the same fact: the
 * exact corner. This link carries it, unfurls into a card in the thread, and
 * lands the reader on the pin.
 */

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const call = await CallDAL.public().findById(id);

  if (!call) return { title: "Grupo no encontrado" };

  // Everything someone in the group needs before deciding to tap: what kind of
  // work, where, and whether it is still going.
  const description = [
    CALL_CATEGORY_LABEL[call.category],
    call.meetingAddress,
    call.neighborhood,
    CALL_STATE_LABEL[callState(call)],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: call.title,
    description,
    openGraph: {
      title: call.title,
      description,
      url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/grupo/${call.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedCallPage({ params }: Params) {
  const { id } = await params;

  const [call, sites, calls, animals, user] = await Promise.all([
    CallDAL.public().findById(id),
    SiteDAL.public().listPublished(),
    CallDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    getCurrentUser(),
  ]);

  if (!call) notFound();

  // A link outlives the shift it points at. `listPublished` drops a grupo the
  // moment it is over, so the shared one is added back — arriving late deserves
  // "este grupo ya terminó" on the card, not an empty map.
  const withShared = calls.some((c) => c.id === call.id)
    ? calls
    : [call, ...calls];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        calls={withShared}
        animals={animals}
        initialSelectedId={call.id}
        // A grupo is always a way of giving time, so a shared one opens on
        // "Ayudar" whatever the reader was looking at last.
        tab="help"
        isAdmin={user?.role === "curator"}
      />
    </main>
  );
}
