import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { getCurrentUser } from "@/data/user/current-user";
import { NEED_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { NeedForm } from "./_components/need-form";

export const metadata: Metadata = { title: NEED_FORM.title };

export default async function ReportNeedPage() {
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
      title={NEED_FORM.title}
      subtitle={NEED_FORM.subtitle}
      backHref="/"
    >
      {(header) => (
        <NeedForm
          barrios={barrios}
          userName={user?.fullName ?? null}
          header={header}
        />
      )}
    </ReportLayout>
  );
}
