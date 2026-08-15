import { ImageResponse } from "next/og";

import { ResourceOfferDAL } from "@/data/resource_offer/resource_offer.dal";
import {
  OG_LABEL,
  RESOURCE_TYPE_LABEL,
  SERVICES_LABEL,
} from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogFonts,
  ogLogo,
  ogTitle,
} from "../../../_components/og-card";
import { OgTruckIcon } from "../../../_components/og-icons";

/**
 * The card for a shared service offer.
 *
 * The description is the title, not the type: "volqueta doble troque
 * disponible fines de semana" is what somebody in the group is scanning for,
 * and "Volqueta" alone is a category they already knew existed. The type
 * becomes the eyebrow, where it belongs.
 *
 * `resolved` green throughout, and it is not decoration — every other card on
 * this map opens with a problem, and this is the one that opens with somebody
 * offering. The colour says which of the two before a word is read.
 */
export const alt = OG_LABEL.siteName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// A literal, not the shared constant: Next reads segment config by static
// analysis. See the caching note in `og-card.tsx` for the hour.
export const revalidate = 3600;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [offer, fonts, logo] = await Promise.all([
    ResourceOfferDAL.public().findById(id),
    ogFonts(),
    ogLogo(),
  ]);

  if (!offer) {
    return new ImageResponse(
      <OgCard
        eyebrow={OG_LABEL.resourceOffer}
        title={OG_LABEL.notFound}
        logo={logo}
      />,
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={RESOURCE_TYPE_LABEL[offer.type]}
        title={ogTitle(offer.description)}
        meta={offer.neighborhood ?? offer.area ?? SERVICES_LABEL.cityWide}
        icon={OgTruckIcon}
        logo={logo}
        accent="resolved"
      />
    ),
    { ...size, fonts },
  );
}
