import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { SERVICES_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { ResourceOfferForm } from "./_components/resource-offer-form";

export const metadata: Metadata = { title: SERVICES_FORM.title };

export default async function ReportServicePage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout
      title={SERVICES_FORM.title}
      subtitle={SERVICES_FORM.subtitle}
      backHref="/servicios"
    >
      <ResourceOfferForm barrios={barrios} />
    </ReportLayout>
  );
}
