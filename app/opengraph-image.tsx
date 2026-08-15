import { ImageResponse } from "next/og";
import { CallDAL } from "@/data/call/call.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";
import { OG_LABEL, callState } from "@/lib/labels";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogFonts,
  ogLogo,
} from "./_components/og-card";
import { OgMapIcon } from "./_components/og-icons";

/**
 * The card for the site itself — what shows when someone shares the bare
 * domain, and the fallback for every route that does not generate its own.
 *
 * It asks the product's question rather than describing the product: a link
 * landing in a relief group thread is competing with forty other messages,
 * and "¿dónde ayudo hoy?" is what makes someone tap.
 *
 * Under the question, the count. It is the only card here with no single
 * entity behind it, so it would otherwise be the one that says least — and
 * "142 puntos · 12 grupos abiertos" is the difference between a map that is
 * being kept and one somebody put up in August and abandoned.
 */
export const alt = `${OG_LABEL.siteName} — ${OG_LABEL.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// A literal, not the shared constant: Next reads segment config by static
// analysis. See the caching note in `og-card.tsx` for the hour.
export const revalidate = 3600;

export default async function Image() {
  const [fonts, logo, sites, calls, workOrders] = await Promise.all([
    ogFonts(),
    ogLogo(),
    SiteDAL.public().listPublished(),
    CallDAL.public().listPublished(),
    WorkOrderDAL.public().listPublished(),
  ]);

  // Only the grupos somebody could still join. A count that includes last
  // week's finished shifts is a bigger number and a worse promise.
  const openCalls = calls.filter((call) => callState(call) !== "ended").length;

  return new ImageResponse(
    (
      <OgCard
        eyebrow={OG_LABEL.siteName}
        title={OG_LABEL.homeTitle}
        meta={OG_LABEL.homeCounts(sites.length, openCalls, workOrders.length)}
        icon={OgMapIcon}
        logo={logo}
        accent="resolved"
      />
    ),
    { ...size, fonts },
  );
}
