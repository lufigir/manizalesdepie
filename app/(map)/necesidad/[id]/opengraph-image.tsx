import { ImageResponse } from "next/og";

import { WorkOrderDAL } from "@/data/work_order/work_order.dal";
import {
  OG_LABEL,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  freshness,
  workOrderRollup,
  type WorkOrderRollup,
} from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogTitle,
  type OgAccent,
} from "../../../_components/og-card";

/**
 * The card for a shared necesidad.
 *
 * The description is the title here, not the category: "se necesitan lonas
 * para cubrir casas" is what makes someone act, and "Riesgo estructural"
 * without it is a label nobody can load a truck for. The category rides in
 * the eyebrow instead, where it still says what kind of case this is.
 */
export const alt = OG_LABEL.siteName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Same grammar as everywhere else: red needs someone, amber has someone,
 *  grey is over. */
const ROLLUP_ACCENT: Record<WorkOrderRollup, OgAccent> = {
  unclaimed: "unclaimed",
  claimed: "claimed",
  closed: "neutral",
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await WorkOrderDAL.public().findById(id);

  if (!order) {
    return new ImageResponse(
      <OgCard eyebrow={OG_LABEL.workOrder} title={OG_LABEL.notFound} />,
      size,
    );
  }

  const rollup = workOrderRollup(order.status);
  const { label: freshLabel } = freshness(order.confirmedAt);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={`${OG_LABEL.workOrder} · ${WORK_ORDER_CATEGORY_LABEL[order.category]}`}
        title={ogTitle(order.description)}
        badge={WORK_ORDER_ROLLUP_LABEL[rollup]}
        meta={[order.neighborhood, freshLabel].filter(Boolean).join(" · ")}
        accent={ROLLUP_ACCENT[rollup]}
      />
    ),
    size,
  );
}
