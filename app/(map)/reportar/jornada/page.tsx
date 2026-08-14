import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { getCurrentUser } from "@/data/user/require-user";
import { CALL_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";

import { CallForm } from "./_components/call-form";

export const metadata: Metadata = { title: CALL_FORM.title };

/**
 * "Ayudar"'s second form: a time and a place where hands are needed.
 *
 * The only route in this app that ends at a sign-in. Not because the
 * information is less trusted than an anonymous report of an acopio — it is not
 * — but because from the moment this row exists, other people rearrange a
 * Saturday around it and hand their phone numbers to whoever convened it. If
 * others depend on you, you show your face.
 *
 * The session is resolved here, in the Server Component, and passed down as a
 * boolean. The form never asks the browser who is signed in.
 */
export default async function ConveneCallPage() {
  const [user, barrios] = await Promise.all([
    getCurrentUser(),
    NeighborhoodDAL.public().list(),
  ]);

  return (
    <ReportLayout
      title={CALL_FORM.title}
      subtitle={CALL_FORM.subtitle}
      backHref="/ayudar"
    >
      <CallForm signedIn={user !== null} barrios={barrios} />
    </ReportLayout>
  );
}
