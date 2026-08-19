import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { SERVICES_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { ServiceForm } from "./_components/service-form";

export const metadata: Metadata = { title: SERVICES_FORM.title };

export default async function ReportServicePage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout
      split={false}
      title={SERVICES_FORM.title}
      subtitle={SERVICES_FORM.subtitle}
      backHref="/"
    >
      <ServiceForm barrios={barrios} />
    </ReportLayout>
  );
}
