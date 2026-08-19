import type { MetadataRoute } from "next";

import { AnimalDAL } from "@/data/animal/animal.dal";
import { NeedDAL } from "@/data/need/need.dal";
import { ServiceDAL } from "@/data/service/service.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { clientEnv } from "@/lib/env";

/**
 * The map itself, plus every shareable pin.
 *
 * There used to be four section URLs beside the root (`/necesito`,
 * `/mascotas`, `/servicios`, and `/ayudar` before that). Each rendered
 * nothing but the same map with one chip pre-selected — a thinner way to
 * reach a screen the reader already has one tap away at `/` — so they were
 * removed rather than indexed as if they were distinct pages.
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

  const [sites, needs, animals, services] = await Promise.all([
    SiteDAL.public().listPublished(),
    NeedDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    ServiceDAL.public().listPublished(),
  ]);

  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    ...sites.map((site) => ({
      url: `${base}/punto/${site.id}`,
      lastModified: new Date(site.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...needs.map((order) => ({
      url: `${base}/necesidad/${order.id}`,
      lastModified: new Date(order.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    // A lost animal is the one row here somebody genuinely searches the open
    // web for — by name, by barrio, days later — so `lastModified` tracks the
    // sighting rather than the confirmation.
    ...animals.map((animal) => ({
      url: `${base}/mascota/${animal.id}`,
      lastModified: new Date(animal.lastSeenAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...services.map((service) => ({
      url: `${base}/servicio/${service.id}`,
      lastModified: new Date(service.confirmedAt),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
