import { z } from "zod";

/**
 * The Alcaldía's daily balance.
 *
 * Every figure is nullable. The report is prose a person writes each evening
 * and its shape moves night to night; a field that disappears tomorrow must not
 * take the rest of the card down with it. The UI therefore renders only what
 * came back, and never a zero standing in for a missing number.
 */
export const situationReportSchema = z.object({
  id: z.uuid(),
  reportedAt: z.iso.datetime({ offset: true }),
  source: z.string(),
  sourceUrl: z.url().nullable(),

  evalRequested: z.number().int().nullable(),
  evalDone: z.number().int().nullable(),
  familiesEvacuated: z.number().int().nullable(),
  homesPartial: z.number().int().nullable(),
  homesTotalLoss: z.number().int().nullable(),

  affectedPeople: z.number().int().nullable(),
  injured: z.number().int().nullable(),
  dead: z.number().int().nullable(),
  inShelters: z.number().int().nullable(),
  petsInShelters: z.number().int().nullable(),

  villagesAffected: z.number().int().nullable(),
  villagesTotal: z.number().int().nullable(),
  schoolsPublic: z.number().int().nullable(),
  schoolsPrivate: z.number().int().nullable(),
  merchantsAffected: z.number().int().nullable(),
  gasPending: z.number().int().nullable(),

  notes: z.string().nullable(),
  expiresAt: z.iso.datetime({ offset: true }),
});

export type SituationReportDTO = z.infer<typeof situationReportSchema>;
