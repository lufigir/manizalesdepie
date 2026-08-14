import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  createWorkOrderSchema,
  workOrderContactSchema,
  workOrderSchema,
  type WorkOrderDTO,
} from "./work_order.dto";
import {
  canClaimWorkOrder,
  canCloseWorkOrder,
  canReportWorkOrder,
  canSeeWorkOrderContact,
  canVerifyWorkOrder,
} from "./work_order.policy";

/** The real Crisis Cleanup number — six days, not the 48 hours AGENTS.md had
 *  it at before the correction in docs/PLAN.md §5. Long enough that a claim
 *  is not lost to a single busy weekend, short enough that a volqueta that
 *  never showed frees the job back up inside the week. */
const CLAIM_DAYS = 6;

/**
 * The only path from this application to `work_order`, `work_order_contact`
 * and `work_order_access`.
 *
 * Private constructor and static factories, like `CallDAL` — and for the
 * same sharper reason there: one of this module's methods reads a third
 * party's exact address and phone.
 */
export class WorkOrderDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  static async create(): Promise<WorkOrderDAL> {
    return new WorkOrderDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): WorkOrderDAL {
    return new WorkOrderDAL(null);
  }

  /** Every open or recently-closed work order, most recently confirmed
   *  first — `work_order_public` already excludes rows merged into another. */
  async listPublished(): Promise<WorkOrderDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("work_order_public")
      .select("*")
      .eq("published", true)
      .order("confirmed_at", { ascending: false });

    if (error) {
      log.error("workOrder.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar las órdenes de trabajo");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * Reports debris, a structural risk, whatever needs a volqueta or a pair
   * of hands. Anonymous, on the map immediately.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async report(input: unknown): Promise<{ id: string }> {
    const data = createWorkOrderSchema.parse(input);

    if (!canReportWorkOrder()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { data: row, error } = await supabase
      .from("work_order")
      .insert({
        category: data.category,
        description: data.description,
        approx_location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        published: true,
        reported_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("workOrder.report failed", { code: error?.code });
      throw new Error("No se pudo publicar la orden de trabajo");
    }

    // The contact half, only if there is one to write — see the guardrail
    // this table exists for. A second insert rather than one statement: the
    // two tables have two different visibility rules, and keeping the
    // writes separate is what keeps that true even here.
    const hasContact =
      data.exactAddress || data.contactName || data.phone || data.notes;
    if (hasContact) {
      const { error: contactError } = await supabase
        .from("work_order_contact")
        .insert({
          work_order_id: row.id,
          exact_address: data.exactAddress ?? "Sin dirección exacta",
          contact_name: data.contactName ?? null,
          phone: data.phone ?? null,
          notes: data.notes ?? null,
        });

      if (contactError) {
        // The work order itself is already published and worth keeping —
        // losing the contact detail is a smaller failure than losing the
        // whole report, so this logs rather than throws.
        log.error("workOrder.report contact insert failed", {
          code: contactError.code,
          workOrderId: row.id,
        });
      }
    }

    log.info("work order reported", {
      workOrderId: row.id,
      byUser: this.user?.id ?? "anon",
    });
    return { id: row.id };
  }

  /**
   * Claims a job. Requires an account — see `canClaimWorkOrder` — and locks
   * it for `CLAIM_DAYS`: long enough to actually go do it, short enough
   * that an abandoned claim does not sit on the map forever blocking anyone
   * else from picking it up.
   */
  async claim(id: string): Promise<void> {
    if (!canClaimWorkOrder(this.user)) {
      throw new Error("Necesitas una cuenta para reclamar una orden de trabajo");
    }

    const supabase = createAdminSupabase();
    const now = new Date();
    const releasesAt = new Date(
      now.getTime() + CLAIM_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await supabase
      .from("work_order")
      .update({
        status: "claimed",
        claimed_by: this.user!.id,
        claimed_at: now.toISOString(),
        releases_at: releasesAt,
      })
      .eq("id", id)
      .eq("status", "unclaimed");

    if (error) {
      log.error("workOrder.claim failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo reclamar la orden de trabajo");
    }

    log.info("work order claimed", { workOrderId: id, byUser: this.user!.id });
  }

  /** Closes a claimed job — completed, already done by someone else, or not
   *  a real case. Honest outcomes, not just "done"; see docs/PLAN.md §4. */
  async close(
    id: string,
    result: "closed_completed" | "closed_by_others" | "closed_rejected",
  ): Promise<void> {
    const { data: before, error: fetchError } = await createAdminSupabase()
      .from("work_order")
      .select("claimed_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !before) throw new Error("No se encontró la orden de trabajo");

    if (!canCloseWorkOrder(this.user, { claimedById: before.claimed_by })) {
      throw new Error("Forbidden");
    }

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("work_order")
      .update({ status: result, closed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      log.error("workOrder.close failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo cerrar la orden de trabajo");
    }

    log.info("work order closed", { workOrderId: id, result });
  }

  /**
   * The exact address and phone. Every read is written to
   * `work_order_access` first — visibility a curator can audit is what
   * deters casual curiosity, per AGENTS.md.
   */
  async getContact(id: string) {
    if (!this.user) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { data: order, error: orderError } = await supabase
      .from("work_order")
      .select("claimed_by, status")
      .eq("id", id)
      .maybeSingle();

    if (orderError || !order) throw new Error("No se encontró la orden de trabajo");

    if (
      !canSeeWorkOrderContact(this.user, {
        claimedById: order.claimed_by,
        status: order.status,
      })
    ) {
      throw new Error("Forbidden");
    }

    const { data, error } = await supabase
      .from("work_order_contact")
      .select("exact_address, contact_name, phone, notes")
      .eq("work_order_id", id)
      .maybeSingle();

    if (error || !data) {
      log.error("workOrder.getContact failed", { code: error?.code, workOrderId: id });
      throw new Error("No se pudo cargar el contacto");
    }

    await supabase
      .from("work_order_access")
      .insert({ work_order_id: id, profile_id: this.user.id });

    return workOrderContactSchema.parse({
      exactAddress: data.exact_address,
      contactName: data.contact_name,
      phone: data.phone,
      notes: data.notes,
    });
  }

  /** Records that a curator checked this against its source. */
  async verify(id: string): Promise<void> {
    if (!canVerifyWorkOrder(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("work_order")
      .update({ verified_by: this.user!.id, verified_at: now, confirmed_at: now })
      .eq("id", id);

    if (error) {
      log.error("workOrder.verify failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo verificar la orden de trabajo");
    }
  }

  /** Map explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): WorkOrderDTO {
    return workOrderSchema.parse({
      id: row.id,
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: row.neighborhood,
      status: row.status,
      claimedByMe: this.user !== null && row.claimed_by === this.user.id,
      releasesAt: row.releases_at,
      verified: row.verified,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
    });
  }
}
