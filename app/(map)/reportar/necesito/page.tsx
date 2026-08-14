import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { REPORT_SECTION } from "@/lib/labels";

import { ReportForm } from "../_components/report-form";
import { ReportLayout } from "../_components/report-layout";

export const metadata: Metadata = { title: REPORT_SECTION.need.title };

/**
 * "Necesito"'s own form: somewhere an affected person can go for help.
 *
 * The household request that this section will eventually carry does not exist
 * yet, so today this creates shelters and census desks and says so.
 */
export default async function ReportNeedPage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout title={REPORT_SECTION.need.title} backHref="/necesito">
      <ReportForm section="need" barrios={barrios} />
    </ReportLayout>
  );
}
