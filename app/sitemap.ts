import type { MetadataRoute } from "next";

import { CallDAL } from "@/data/call/call.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { WorkOrderDAL } from "@/data/work_order/work_order.dal";
import { clientEnv } from "@/lib/env";

/**
 * The four sections, plus every shareable pin.
 *
 * Individual entities are in here because they are the pages worth finding:
 * someone searching for a specific shelter by name should land on its own
 * card, not on a map they then have to hunt through. They are also the
 * pages that go stale fastest, which is what `lastModified` is for — a
 * confirmation is exactly the event that makes a row worth recrawling.
 *
 * Read through `.public()`, so an unpublished row never reaches a crawler
 * even though the DAL would show it to a curator.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL;

  const [sites, calls, workOrders] = await Promise.all([
    SiteDAL.public().listPublished(),
    CallDAL.public().listPublished(),
    WorkOrderDAL.public().listPublished(),
  ]);

  const sections: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/ayudar`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/necesito`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/mascotas`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/servicios`, changeFrequency: "hourly", priority: 0.7 },
  ];

  return [
    ...sections,
    ...sites.map((site) => ({
      url: `${base}/punto/${site.id}`,
      lastModified: new Date(site.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...calls.map((call) => ({
      url: `${base}/grupo/${call.id}`,
      lastModified: new Date(call.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...workOrders.map((order) => ({
      url: `${base}/necesidad/${order.id}`,
      lastModified: new Date(order.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
