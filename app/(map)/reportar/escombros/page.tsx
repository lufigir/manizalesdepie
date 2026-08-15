import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { WORK_ORDER_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { WorkOrderForm } from "./_components/work-order-form";

export const metadata: Metadata = { title: WORK_ORDER_FORM.title };

export default async function ReportWorkOrderPage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout
      title={WORK_ORDER_FORM.title}
      subtitle={WORK_ORDER_FORM.subtitle}
      backHref="/"
    >
      <WorkOrderForm barrios={barrios} />
    </ReportLayout>
  );
}
