import { SiteDAL } from "@/data/site/site.dal";
import { clientEnv } from "@/lib/env";

import { MapShell } from "./_components/map-shell";

/**
 * The map is the product, so it is the root route.
 *
 * A Server Component: it reads through the DAL and hands plain data down. The
 * only client code on this page is the map island itself, because that is the
 * only part that needs interactivity.
 */
export default async function MapPage() {
  const sites = await SiteDAL.public().listPublished();

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapShell
        sites={sites}
        curatorWhatsapp={clientEnv.NEXT_PUBLIC_CURATOR_WHATSAPP}
      />
    </main>
  );
}
