import "server-only";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  situationReportSchema,
  type SituationReportDTO,
} from "./situation.dto";

/**
 * The only path from this application to `situation_report`.
 *
 * Read-only, and so there is no policy module beside it: there are no rules to
 * express yet. These are figures the Alcaldía publishes to the whole city, and
 * nothing in the app writes them — today they arrive by hand. When a curator
 * screen starts editing them, that is when a `.policy.ts` and an `.actions.ts`
 * earn their place, and not before.
 */
export class SituationDAL {
  private constructor() {}

  static public(): SituationDAL {
    return new SituationDAL();
  }

  /**
   * The most recent balance, or null once it has expired.
   *
   * Expiry is enforced here rather than left to the reader. A count of who is
   * in a shelter is true for an evening; showing yesterday's with the same
   * confidence as tonight's is the exact failure this product is built to
   * avoid, so a stale report is no report.
   */
  async latest(): Promise<SituationReportDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("situation_report")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("reported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error("situation.latest failed", { code: error.code });
      // The map is the product; a missing balance card must not take it down.
      return null;
    }

    return data ? this.toDTO(data) : null;
  }

  /** Mapped explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): SituationReportDTO {
    return situationReportSchema.parse({
      id: row.id,
      reportedAt: row.reported_at,
      source: row.source,
      sourceUrl: row.source_url,
      evalRequested: row.eval_requested,
      evalDone: row.eval_done,
      familiesEvacuated: row.families_evacuated,
      homesPartial: row.homes_partial,
      homesTotalLoss: row.homes_total_loss,
      affectedPeople: row.affected_people,
      injured: row.injured,
      dead: row.dead,
      inShelters: row.in_shelters,
      petsInShelters: row.pets_in_shelters,
      villagesAffected: row.villages_affected,
      villagesTotal: row.villages_total,
      schoolsPublic: row.schools_public,
      schoolsPrivate: row.schools_private,
      merchantsAffected: row.merchants_affected,
      gasPending: row.gas_pending,
      notes: row.notes,
      expiresAt: row.expires_at,
    });
  }
}
