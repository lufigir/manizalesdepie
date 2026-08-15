import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env";

/**
 * Open to crawlers on purpose — someone searching "acopio Manizales" is
 * exactly who this is for, and a relief map that search engines cannot see
 * only reaches people who already have the link.
 *
 * The private halves are named rather than left to chance: `/auth` is a
 * login flow with nothing to index, `/admin` is the curator console, and
 * `/reportar` is a set of forms whose value is entirely in submitting them,
 * not in reading them. A form indexed above the map it feeds sends someone
 * to report a shelter when they were looking for one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/admin", "/reportar/"],
    },
    sitemap: `${clientEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
