import { ImageResponse } from "next/og";

import { OG_LABEL } from "@/lib/labels";

import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "./_components/og-card";

/**
 * The card for the site itself — what shows when someone shares the bare
 * domain, and the fallback for every route that does not generate its own.
 *
 * It asks the product's question rather than describing the product: a link
 * landing in a relief group thread is competing with forty other messages,
 * and "¿dónde ayudo hoy?" is what makes someone tap.
 */
export const alt = `${OG_LABEL.siteName} — ${OG_LABEL.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow={OG_LABEL.siteName}
        title={OG_LABEL.homeTitle}
        meta={OG_LABEL.homeMeta}
        accent="resolved"
      />
    ),
    size,
  );
}
