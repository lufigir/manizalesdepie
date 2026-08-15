import { ImageResponse } from "next/og";

import { CallDAL } from "@/data/call/call.dal";
import {
  CALL_CATEGORY_LABEL,
  CALL_STATE_LABEL,
  OG_LABEL,
  callState,
  callWhen,
  slotsLabel,
  type CallState,
} from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogTitle,
  type OgAccent,
} from "../../../_components/og-card";

/**
 * The card for a shared grupo — the route the whole feature was built
 * around. A shift is organised in a WhatsApp group, and the line of text
 * that circulates there always loses the same two facts: the exact corner
 * and the hour. Both are on this card before anyone taps.
 */
export const alt = OG_LABEL.siteName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Same colour grammar as a site's status — see `CallState`. */
const STATE_ACCENT: Record<CallState, OgAccent> = {
  live: "resolved",
  upcoming: "claimed",
  full: "neutral",
  ended: "neutral",
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = await CallDAL.public().findById(id);

  if (!call) {
    return new ImageResponse(
      <OgCard eyebrow={OG_LABEL.call} title={OG_LABEL.notFound} />,
      size,
    );
  }

  const state = callState(call);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={`${OG_LABEL.call} · ${CALL_CATEGORY_LABEL[call.category]}`}
        title={ogTitle(call.title)}
        badge={CALL_STATE_LABEL[state]}
        // The hour first: for a shift it is half the identity, and it is the
        // fact the forwarded message loses.
        meta={[callWhen(call), call.neighborhood, slotsLabel(call)]
          .filter(Boolean)
          .join(" · ")}
        accent={STATE_ACCENT[state]}
      />
    ),
    size,
  );
}
