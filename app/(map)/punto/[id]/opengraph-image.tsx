import { ImageResponse } from "next/og";

import { SiteDAL } from "@/data/site/site.dal";
import type { SiteStatus } from "@/data/site/site.dto";
import {
  OG_LABEL,
  SITE_STATUS_LABEL,
  SITE_TYPE_LABEL,
  freshness,
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
import { OgPackageIcon } from "../../../_components/og-icons";

/**
 * The card for a shared pin — the answer to "¿por dónde queda exactamente?"
 * as it appears in the thread, before anyone taps.
 *
 * Status leads because it is the fact that decides whether the tap is worth
 * making: a closed acopio and an open one are the same name and the same
 * address, and only one of them is worth crossing the city for. The same
 * status also picks the accent, so the card is the right colour from a
 * distance at which nobody can read the badge.
 */
export const alt = OG_LABEL.siteName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// A literal, not the shared constant: Next reads segment config by static
// analysis. See the caching note in `og-card.tsx` for the hour.
export const revalidate = 3600;

/** The same three-way grammar the map draws: open is good news, full is "not
 *  right now", closed and unknown are neither. */
const STATUS_ACCENT: Record<SiteStatus, OgAccent> = {
  open: "resolved",
  full: "claimed",
  closed: "unclaimed",
  unknown: "neutral",
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [site, fonts, logo] = await Promise.all([
    SiteDAL.public().findById(id),
    ogFonts(),
    ogLogo(),
  ]);

  if (!site) {
    return new ImageResponse(
      <OgCard eyebrow={OG_LABEL.site} title={OG_LABEL.notFound} logo={logo} />,
      { ...size, fonts },
    );
  }

  const { label: freshLabel } = freshness(site.confirmedAt);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={SITE_TYPE_LABEL[site.type]}
        title={ogTitle(site.name)}
        badge={SITE_STATUS_LABEL[site.status]}
        meta={[site.neighborhood, freshLabel].filter(Boolean).join(" · ")}
        icon={OgPackageIcon}
        logo={logo}
        accent={STATUS_ACCENT[site.status]}
      />
    ),
    { ...size, fonts },
  );
}
