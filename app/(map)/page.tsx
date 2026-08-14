import { AnimalDAL } from "@/data/animal/animal.dal";
import { SiteDAL } from "@/data/site/site.dal";
import { SituationDAL } from "@/data/situation/situation.dal";

import { MapShell } from "./_components/map-shell";

/**
 * The map is the product, so it is the root route.
 *
 * A Server Component: it reads through the DAL and hands plain data down. The
 * only client code on this page is the map island itself, because that is the
 * only part that needs interactivity.
 */
export default async function MapPage() {
  const [sites, animals, report] = await Promise.all([
    SiteDAL.public().listPublished(),
    AnimalDAL.public().listPublished(),
    SituationDAL.public().latest(),
  ]);

  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapShell sites={sites} animals={animals} report={report} />
    </main>
  );
}
