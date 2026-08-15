import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  attendWorkOrderSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
  workOrderAttendeeSchema,
  workOrderSchema,
  type WorkOrderAttendeeDTO,
  type WorkOrderDTO,
} from "./work_order.dto";
import {
  canAttendWorkOrder,
  canCloseWorkOrder,
  canManageWorkOrder,
  canReportWorkOrder,
  canUpdateWorkOrder,
  canVerifyWorkOrder,
} from "./work_order.policy";

/** How long a closed case stays on the public map before it drops off on
 *  its own. Long enough that someone already on the way still sees it and a
 *  wrong "cerrado" is easy to catch and undo; short enough that the map
 *  does not fill up with resolved cases nobody needs to see any more. */
const CLOSED_VISIBLE_HOURS = 6;

/**
 * The only path from this application to `work_order` and
 * `work_order_attendance`.
 *
 * `work_order_contact` and `work_order_access` are gone: the contact fields
 * live on `work_order` itself and are public, so there is no second
 * visibility rule to keep and no reveal left to audit.
 *
 * Private constructor and static factories, like `CallDAL` — kept even
 * though most methods here no longer need an identity, because `verify`
 * still does, and a class with a public constructor would let that one slip
 * through unauthenticated by accident.
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
   *  first. `work_order_public` already excludes rows merged into another;
   *  this also drops a closed case once `expires_at` has passed — see
   *  `CLOSED_VISIBLE_HOURS`.
   *
   *  A curator sees hidden cases too, distinguished on the card by
   *  `AdminActions` — otherwise `setPublished(id, false)` would have no way
   *  back short of a direct database query. Anyone else only ever sees
   *  `published = true`, same as before. */
  async listPublished(): Promise<WorkOrderDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("work_order_public")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("confirmed_at", { ascending: false });

    if (error) {
      log.error("workOrder.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar las órdenes de trabajo");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One case, or null. What a shared link resolves to.
   *
   * Not filtered by `expires_at`, unlike `listPublished`: a link posted in a
   * WhatsApp group outlives the case it points at, and "ya se resolvió" on
   * the card is a better answer than a 404 for someone arriving late.
   */
  async findById(id: string): Promise<WorkOrderDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("work_order_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("workOrder.findById failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo cargar la necesidad");
    }

    return data ? this.toDTO(data) : null;
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
        // One insert now, not two. The contact fields used to be written to
        // a separate table because they had a different visibility rule;
        // they have the same one as the description now.
        exact_address: data.exactAddress ?? null,
        contact_name: data.contactName ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("workOrder.report failed", { code: error?.code });
      throw new Error("No se pudo publicar la orden de trabajo");
    }

    log.info("work order reported", {
      workOrderId: row.id,
      byUser: this.user?.id ?? "anon",
    });
    return { id: row.id };
  }

  /**
   * "Yo puedo atender" — anonymous, no account, and several people can do
   * this for the same case, each leaving a note for the others.
   *
   * It returns nothing now. It used to hand back `work_order_contact` in
   * the same response, because attending was the only way to ever see it;
   * the card already shows those fields to everyone, so the reveal, the
   * access log and the round trip that carried them are all gone.
   */
  async attend(input: unknown): Promise<void> {
    const data = attendWorkOrderSchema.parse(input);

    if (!canAttendWorkOrder()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();

    const { error } = await supabase.from("work_order_attendance").insert({
      work_order_id: data.workOrderId,
      name: data.name,
      phone: data.phone,
      note: data.note ?? null,
    });

    if (error) {
      log.error("workOrder.attend failed", {
        code: error.code,
        workOrderId: data.workOrderId,
      });
      throw new Error("No se pudo registrar que vas a atender este caso");
    }

    log.info("work order attended", { workOrderId: data.workOrderId });
  }

  /** Who is already on a case, oldest first — the order they committed in,
   *  which is also the order their notes read in as a thread. */
  async listAttendees(workOrderId: string): Promise<WorkOrderAttendeeDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("work_order_attendance_public")
      .select("id, name, phone, note, created_at")
      .eq("work_order_id", workOrderId)
      .order("created_at", { ascending: true });

    if (error) {
      log.error("workOrder.listAttendees failed", { code: error.code, workOrderId });
      throw new Error("No se pudo cargar quién va a atender este caso");
    }

    return (data ?? []).map((row) =>
      workOrderAttendeeSchema.parse({
        id: row.id,
        name: row.name,
        phone: row.phone,
        note: row.note,
        createdAt: row.created_at,
      }),
    );
  }

  /** Closes a case — completed, already done by someone else, or not a real
   *  case. Honest outcomes, not just "done"; see docs/PLAN.md §4. Open to
   *  anyone now (see `canCloseWorkOrder`), and starts the clock on
   *  `CLOSED_VISIBLE_HOURS` instead of leaving a resolved case on the map
   *  forever. */
  async close(
    id: string,
    result: "closed_completed" | "closed_by_others" | "closed_rejected",
  ): Promise<void> {
    if (!canCloseWorkOrder()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + CLOSED_VISIBLE_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await supabase
      .from("work_order")
      .update({ status: result, closed_at: now.toISOString(), expires_at: expiresAt })
      .eq("id", id);

    if (error) {
      log.error("workOrder.close failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo cerrar la orden de trabajo");
    }

    log.info("work order closed", { workOrderId: id, result });
  }

  /** Corrects a case's own category or description — anonymous, like
   *  reporting one. Never touches `work_order_contact`. */
  async update(input: unknown): Promise<void> {
    const data = updateWorkOrderSchema.parse(input);

    if (!canUpdateWorkOrder()) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.description !== undefined) patch.description = data.description;
    if (Object.keys(patch).length === 0) return;

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("work_order").update(patch).eq("id", data.id);

    if (error) {
      log.error("workOrder.update failed", { code: error.code, workOrderId: data.id });
      throw new Error("No se pudo actualizar la orden de trabajo");
    }

    log.info("work order updated", { workOrderId: data.id, fields: Object.keys(patch) });
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

  /** A curator hides or republishes a case — reversible, the same
   *  `published` column every list already filters by, no history lost. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageWorkOrder(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("work_order")
      .update({ published })
      .eq("id", id);

    if (error) {
      log.error("workOrder.setPublished failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo cambiar la visibilidad del caso");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. Cascades
   *  to `work_order_attendance`. */
  async remove(id: string): Promise<void> {
    if (!canManageWorkOrder(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("work_order").delete().eq("id", id);

    if (error) {
      log.error("workOrder.remove failed", { code: error.code, workOrderId: id });
      throw new Error("No se pudo eliminar el caso");
    }

    log.info("work order deleted", { workOrderId: id, byUser: this.user!.id });
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
      attendeeCount: row.attendee_count,
      exactAddress: row.exact_address,
      contactName: row.contact_name,
      phone: row.phone,
      notes: row.notes,
      verified: row.verified,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
      published: row.published,
    });
  }
}
