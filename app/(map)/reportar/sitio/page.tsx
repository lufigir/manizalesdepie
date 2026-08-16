import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { REPORT_LABEL } from "@/lib/labels";

import { ReportForm } from "../_components/report-form";
import { ReportLayout } from "../_components/report-layout";

export const metadata: Metadata = { title: REPORT_LABEL.title };

/**
 * A place that stays put: acopio, sangre, PMU, albergue, censo.
 *
 * One route for all five, replacing `/reportar/ayudar` and `/reportar/necesito`
 * — both wrote a `site` row, and their names ("dónde ayudar", "punto de ayuda")
 * asked the reader to sort out who benefits before they could pick either.
 *
 * A full route rather than a dialog over the map — the form carries its own map
 * for placing the pin, and two maps stacked in a modal on a phone is a fight
 * over every gesture.
 *
 * No account is asked for anywhere in here. What holds a bad report back is not
 * registration but the pin saying "sin confirmar" until the city says otherwise.
 */
export default async function ReportSitePage() {
  // The barrios are read here, in the Server Component, and handed down as
  // plain data: 118 names and coordinates, about four kilobytes.
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout title={REPORT_LABEL.title} backHref="/">
      {(header) => <ReportForm barrios={barrios} header={header} />}
    </ReportLayout>
  );
}
