import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeedDAL } from "@/data/need/need.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { clientEnv } from "@/lib/env";
import {
  OG_LABEL,
  NEED_CATEGORY_LABEL,
  NEED_ROLLUP_LABEL,
  needRollup,
} from "@/lib/labels";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared necesidad.
 *
 * The same job `/punto/[id]` does for a place and `/servicio/[id]` does for a
 * service: a case circulates as a line of text in a WhatsApp group and loses
 * the two facts that decide whether anyone acts — what is actually needed,
 * and where. This link carries both and lands on the pin with its card
 * already open.
 *
 * The exact address is NOT here, and never will be: the public row carries
 * only a block-level `location` (see the guardrail in AGENTS.md). What the
 * link buys is the block and the ask, which is what someone deciding
 * whether to load a truck actually needs.
 */

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const order = await NeedDAL.public().findById(id);

  if (!order) return { title: OG_LABEL.notFound };

  const title = `${NEED_CATEGORY_LABEL[order.category]}${
    order.neighborhood ? ` · ${order.neighborhood}` : ""
  }`;
  const description = `${NEED_ROLLUP_LABEL[needRollup(order)]}. ${
    order.description
  }`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${clientEnv.NEXT_PUBLIC_SITE_URL}/necesidad/${order.id}`,
      locale: "es_CO",
      type: "website",
    },
  };
}

export default async function SharedNeedPage({ params }: Params) {
  const { id } = await params;

  const [order, sites, needs, animals, user] = await Promise.all([
    NeedDAL.public().findById(id),
    SiteDAL.public().listPublished(),
    NeedDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    getCurrentUser(),
  ]);

  if (!order) notFound();

  // A link outlives the case it points at: `listPublished` drops one a few
  // hours after it closes, so the shared one is added back rather than
  // opening onto an empty map.
  const withShared = needs.some((o) => o.id === order.id)
    ? needs
    : [order, ...needs];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        needs={withShared}
        animals={animals}
        initialSelectedId={order.id}
        // A case is something to go and do, so a shared one opens on
        // "Ayudar" whatever the reader was looking at last.
        tab="help"
        user={user}
      />
    </main>
  );
}
