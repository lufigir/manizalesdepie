import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";
import { clientEnv } from "@/lib/env";
import {
  OG_LABEL,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  workOrderRollup,
} from "@/lib/labels";

import { MapWorkspace } from "../../_components/map-workspace";

/**
 * A shared necesidad.
 *
 * The same job `/punto/[id]` does for a place and `/grupo/[id]` does for a
 * shift: a case circulates as a line of text in a WhatsApp group and loses
 * the two facts that decide whether anyone acts — what is actually needed,
 * and where. This link carries both and lands on the pin with its card
 * already open.
 *
 * The exact address is NOT here, and never will be: the public row carries
 * only a block-level `approx_location` (see the guardrail in AGENTS.md).
 * What the link buys is the block and the ask, which is what someone
 * deciding whether to load a truck actually needs.
 */

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const order = await WorkOrderDAL.public().findById(id);

  if (!order) return { title: OG_LABEL.notFound };

  const title = `${WORK_ORDER_CATEGORY_LABEL[order.category]}${
    order.neighborhood ? ` · ${order.neighborhood}` : ""
  }`;
  const description = `${WORK_ORDER_ROLLUP_LABEL[workOrderRollup(order)]}. ${
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

export default async function SharedWorkOrderPage({ params }: Params) {
  const { id } = await params;

  const [order, sites, workOrders, animals, neighborhoodStatuses, user] =
    await Promise.all([
      WorkOrderDAL.public().findById(id),
      SiteDAL.public().listPublished(),
      WorkOrderDAL.public().listPublished(),
      AnimalDAL.public().listPublished(),
      NeighborhoodDAL.public().statuses(),
      getCurrentUser(),
    ]);

  if (!order) notFound();

  // A link outlives the case it points at: `listPublished` drops one a few
  // hours after it closes, so the shared one is added back rather than
  // opening onto an empty map.
  const withShared = workOrders.some((o) => o.id === order.id)
    ? workOrders
    : [order, ...workOrders];

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapWorkspace
        sites={sites}
        workOrders={withShared}
        animals={animals}
        neighborhoodStatuses={neighborhoodStatuses}
        initialSelectedId={order.id}
        // A case is something to go and do, so a shared one opens on
        // "Ayudar" whatever the reader was looking at last.
        tab="help"
        user={user}
      />
    </main>
  );
}
