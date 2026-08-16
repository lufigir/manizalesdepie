import type { Metadata } from "next";

import { NeighborhoodDAL } from "@/data/neighborhood/neighborhood.dal";
import { ANIMAL_FORM } from "@/lib/labels";

import { ReportLayout } from "../_components/report-layout";
import { AnimalForm } from "./_components/animal-form";

export const metadata: Metadata = { title: "Reportar un animal" };

/**
 * Its own route rather than a mode of the site form, because almost nothing is
 * shared: the questions are different, the location is optional, and the photo
 * is the field that matters most. Folding them together would have meant a form
 * that hides half of itself.
 */
export default async function ReportAnimalPage() {
  const barrios = await NeighborhoodDAL.public().list();

  return (
    <ReportLayout title={ANIMAL_FORM.title} backHref="/">
      {(header) => <AnimalForm barrios={barrios} header={header} />}
    </ReportLayout>
  );
}
