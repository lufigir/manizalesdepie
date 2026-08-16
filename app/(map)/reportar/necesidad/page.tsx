import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { WORK_ORDER_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { WorkOrderForm } from "./_components/work-order-form";

export const metadata: Metadata = { title: WORK_ORDER_FORM.title };

export default async function ReportWorkOrderPage() {
  // The form stays anonymous — no account is required to report a need. The
  // session is read only to pre-fill the contact name for somebody who
  // already gave it to us, and the field stays editable because a report is
  // frequently written by a neighbour on somebody else's behalf.
  const [barrios, user] = await Promise.all([
    NeighborhoodDAL.public().list(),
    getCurrentUser(),
  ]);

  return (
    <ReportLayout
      title={WORK_ORDER_FORM.title}
      subtitle={WORK_ORDER_FORM.subtitle}
      backHref="/"
    >
      <WorkOrderForm barrios={barrios} userName={user?.fullName ?? null} />
    </ReportLayout>
  );
}
