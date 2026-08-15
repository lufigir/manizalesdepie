import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { CALL_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";

import { CallForm } from "./_components/call-form";

export const metadata: Metadata = { title: CALL_FORM.title };

/**
 * "Ayudar"'s second form: dónde hay gente trabajando.
 *
 * This was the only route in the app that ended at a sign-in. The account was
 * never about trusting the information — an anonymous report of an acopio is
 * accepted without argument — it was about the phone numbers an organiser
 * collected from whoever signed up. Nobody signs up any more (one person did,
 * ever), so nobody is a custodian of anything, and the wall came down with
 * the roster it was guarding.
 */
export default async function ReportCallPage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout
      title={CALL_FORM.title}
      subtitle={CALL_FORM.subtitle}
      backHref="/"
    >
      <CallForm barrios={barrios} />
    </ReportLayout>
  );
}
