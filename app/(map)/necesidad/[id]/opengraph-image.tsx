import { ImageResponse } from "next/og";

import { NeedDAL } from "@/data/need/need.dal";
import {
  OG_LABEL,
  NEED_CATEGORY_LABEL,
  NEED_LABEL,
  NEED_ROLLUP_LABEL,
  freshness,
  needRollup,
  type NeedRollup,
} from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogFonts,
  ogLogo,
  ogTitle,
  type OgAccent,
} from "../../../_components/og-card";
import { OgHardHatIcon } from "../../../_components/og-icons";

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
// A literal, not the shared constant: Next reads segment config by static
// analysis. See the caching note in `og-card.tsx` for the hour.
export const revalidate = 3600;

/** Same grammar as the marker (see `NEED_ROLLUP_MARKER`): red needs
 *  someone, amber means people are on it and it is not over, green is only
 *  ever an actual resolution, grey is off the list without being one. */
const ROLLUP_ACCENT: Record<NeedRollup, OgAccent> = {
  untouched: "pending",
  onTheWay: "pending",
  partial: "underway",
  advanced: "underway",
  reopened: "pending",
  done: "resolved",
  dismissed: "neutral",
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, fonts, logo] = await Promise.all([
    NeedDAL.public().findById(id),
    ogFonts(),
    ogLogo(),
  ]);

  if (!order) {
    return new ImageResponse(
      <OgCard eyebrow={OG_LABEL.need} title={OG_LABEL.notFound} logo={logo} />,
      { ...size, fonts },
    );
  }

  const rollup = needRollup(order);
  const { label: freshLabel } = freshness(
    order.confirmedAt,
    NEED_LABEL.fresh,
  );

  return new ImageResponse(
    (
      <OgCard
        eyebrow={`${OG_LABEL.need} · ${NEED_CATEGORY_LABEL[order.category]}`}
        title={ogTitle(order.description)}
        badge={NEED_ROLLUP_LABEL[rollup]}
        meta={[order.neighborhood, freshLabel].filter(Boolean).join(" · ")}
        icon={OgHardHatIcon}
        logo={logo}
        accent={ROLLUP_ACCENT[rollup]}
      />
    ),
    { ...size, fonts },
  );
}
