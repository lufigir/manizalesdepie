import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { CALL_CATEGORY_LABEL } from "@/lib/labels";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  adminUpdateCallSchema,
  callSchema,
  createCallSchema,
  relocateCallSchema,
  type CallCategory,
  type CallDTO,
} from "./call.dto";
import {
  canCreateCall,
  canManageCall,
  canRelocateCall,
} from "./call.policy";

/**
 * The only path from this application to `volunteer_call`.
 *
 * Private constructor and static factories, like every other DAL here, so an
 * instance cannot exist without a resolved authorization context.
 */
export class CallDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  /** Authenticated context, for anything that writes. */
  static async create(): Promise<CallDAL> {
    return new CallDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the map anyone can open. */
  static public(): CallDAL {
    return new CallDAL(null);
  }

  /**
   * Every call still worth showing, soonest first.
   *
   * Filtered by `expires_at` rather than by `starts_at`, so a cuadrilla
   * already under way stays on the map — turning up an hour after it was
   * reported is help, not a mistake. Once the day is over it drops off on its
   * own: a call is the one thing here that genuinely stops existing, which is
   * different from a site going stale.
   */
  async listPublished(): Promise<CallDTO[]> {
    const supabase = await createServerSupabase();

    let query = supabase
      .from("volunteer_call_public")
      .select("*")
      .gt("expires_at", new Date().toISOString());

    // A curator sees a grupo they hid too, marked on the card by
    // `AdminActions` — otherwise `setPublished(id, false)` would have no
    // way back short of a direct database query.
    if (this.user?.role !== "curator") {
      query = query.eq("published", true);
    }

    const { data, error } = await query.order("starts_at", { ascending: true });

    if (error) {
      log.error("call.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los grupos");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One call, or null. What a shared link resolves to.
   *
   * Not filtered by `expires_at`: a link posted in a WhatsApp group outlives the
   * gathering it points at, and "ese grupo ya terminó" is a better answer than a
   * 404 for someone who arrives late.
   */
  async findById(id: string): Promise<CallDTO | null> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("volunteer_call_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      log.error("call.findById failed", { code: error.code, callId: id });
      throw new Error("No se pudo cargar el grupo");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Calls near a point AND near an hour, nearest first.
   *
   * Both halves are required. Two gatherings in the same park on different
   * days are two real things; merging them by distance alone would send people
   * on the wrong day, which is worse than a duplicate pin.
   */
  async findNearby(
    longitude: number,
    latitude: number,
    startsAt: string,
    radiusMeters = 150,
    windowHours = 3,
  ): Promise<
    { id: string; title: string; startsAt: string; distanceM: number }[]
  > {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase.rpc("find_nearby_calls", {
      lng: longitude,
      lat: latitude,
      at: startsAt,
      radius_m: radiusMeters,
      window_hours: windowHours,
    });

    if (error) {
      log.error("call.findNearby failed", { code: error.code });
      throw new Error("No se pudo verificar si ya hay un grupo parecido");
    }

    return (data ?? []).map(
      (row: {
        id: string;
        category: CallCategory;
        neighborhood: string | null;
        starts_at: string;
        distance_m: number;
      }) => ({
        id: row.id,
        // Same name the map shows for it, built the same way — see `toDTO`.
        title: titleOf(row.category, row.neighborhood),
        startsAt: row.starts_at,
        distanceM: Math.round(row.distance_m),
      }),
    );
  }

  /**
   * "Alguien se está juntando aquí." No account, no hour, no name.
   *
   * Anonymous the way `SiteDAL.propose` is: if the caller happens to have a
   * session, `created_by` still records it (nice to have, never required),
   * which is why this resolves the user rather than skipping straight to the
   * write.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async gather(input: unknown): Promise<{ id: string }> {
    const data = createCallSchema.parse(input);

    if (!canCreateCall()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const now = new Date();

    const { data: row, error } = await supabase
      .from("volunteer_call")
      .insert({
        category: data.category,
        description: data.description ?? null,
        meeting_point: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        meeting_address: data.meetingAddress ?? null,
        whatsapp: data.whatsapp ?? null,
        // "Empezó ahora" rather than asked for — there is no hour to state,
        // the group is already there. `callState` reads this against
        // `expires_at` below, so this alone is enough to show "En curso".
        starts_at: now.toISOString(),
        published: true,
        // Derived, never asked for. A gathering nobody is running turns off
        // with the day, at Bogotá midnight, whichever hour it was reported.
        expires_at: endOfDayBogota(now),
        created_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("call.gather failed", { code: error?.code });
      throw new Error("No se pudo publicar el grupo");
    }

    log.info("call gathered", {
      callId: row.id,
      byUser: this.user?.id ?? "anon",
      withContact: data.whatsapp !== undefined,
    });
    return { id: row.id };
  }

  /**
   * Moves a pin, within its own barrio. Anyone — see `canRelocateCall`.
   *
   * There is no `neighborhood_at` RPC call here on purpose: that function is
   * revoked from every role except the trigger itself (security definer),
   * deliberately, so application code has no direct line to it (see the
   * comment on `neighborhood_at` in 20260814080000_neighborhood_boundaries.sql
   * — "there is no surface here to abuse"). Respecting that means asking the
   * question the trigger already answers instead of opening a second door to
   * it: write the new point, let `volunteer_call_sets_neighborhood` recompute
   * `neighborhood_id` the same way it does for every other write, and revert
   * if the barrio it lands in is not the one it started in.
   */
  async relocate(input: unknown): Promise<void> {
    const data = relocateCallSchema.parse(input);

    if (!canRelocateCall()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();

    const { data: before, error: fetchError } = await supabase
      .from("volunteer_call")
      .select("neighborhood_id, meeting_point")
      .eq("id", data.callId)
      .maybeSingle();

    if (fetchError || !before) {
      log.error("call.relocate lookup failed", {
        code: fetchError?.code,
        callId: data.callId,
      });
      throw new Error("No se encontró el punto");
    }

    const { data: after, error: updateError } = await supabase
      .from("volunteer_call")
      .update({
        meeting_point: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
      })
      .eq("id", data.callId)
      .select("neighborhood_id")
      .single();

    if (updateError || !after) {
      log.error("call.relocate update failed", {
        code: updateError?.code,
        callId: data.callId,
      });
      throw new Error("No se pudo mover el punto");
    }

    if (after.neighborhood_id !== before.neighborhood_id) {
      // The point moved out of its own barrio. Put it back rather than
      // leave the row briefly wrong for the next reader — `meeting_point`
      // round-trips through its own EWKB text, so the value PostgREST just
      // handed back is valid input again.
      await supabase
        .from("volunteer_call")
        .update({ meeting_point: before.meeting_point })
        .eq("id", data.callId);

      throw new Error(
        "Ese punto queda en otro barrio. Solo se puede mover dentro del mismo barrio.",
      );
    }

    log.info("call relocated", { callId: data.callId });
  }

  /** A curator corrects any of a grupo's own fields — never the meeting
   *  point, see `adminUpdateCallSchema`. */
  async adminUpdate(input: unknown): Promise<void> {
    const data = adminUpdateCallSchema.parse(input);

    if (!canManageCall(this.user)) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.description !== undefined) patch.description = data.description;
    if (data.meetingAddress !== undefined) patch.meeting_address = data.meetingAddress;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (Object.keys(patch).length === 0) return;

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("volunteer_call")
      .update(patch)
      .eq("id", data.id);

    if (error) {
      log.error("call.adminUpdate failed", { code: error.code, callId: data.id });
      throw new Error("No se pudo actualizar el grupo");
    }

    log.info("call admin-updated", { callId: data.id, fields: Object.keys(patch) });
  }

  /** A curator hides or republishes a grupo — reversible, the same
   *  `published` column every list already filters by. */
  async setPublished(id: string, published: boolean): Promise<void> {
    if (!canManageCall(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("volunteer_call")
      .update({ published })
      .eq("id", id);

    if (error) {
      log.error("call.setPublished failed", { code: error.code, callId: id });
      throw new Error("No se pudo cambiar la visibilidad del grupo");
    }
  }

  /** A real `DELETE FROM`, for spam and test rows — curators only. */
  async remove(id: string): Promise<void> {
    if (!canManageCall(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("volunteer_call").delete().eq("id", id);

    if (error) {
      log.error("call.remove failed", { code: error.code, callId: id });
      throw new Error("No se pudo eliminar el grupo");
    }

    log.info("call deleted", { callId: id, byUser: this.user!.id });
  }

  /** Mapped explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): CallDTO {
    return callSchema.parse({
      id: row.id,
      title: titleOf(
        row.category as CallCategory,
        row.neighborhood as string | null,
      ),
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      meetingAddress: row.meeting_address,
      neighborhood: row.neighborhood,
      startsAt: row.starts_at,
      whatsapp: row.whatsapp,
      confirmedAt: row.confirmed_at,
      expiresAt: row.expires_at,
      createdById: row.created_by,
      published: row.published,
    });
  }
}

const bogotaCalendarDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 23:59:59 in Bogotá, expressed as the UTC instant it actually is.
 *
 * Bogotá carries no DST and sits at a fixed UTC-5, so "23:59 local" is always
 * "04:59 UTC the next calendar day" — `Date.UTC` normalises the day rollover
 * on its own when the hour is given as 28 rather than 4.
 */
function endOfDayBogota(now: Date): string {
  const [year, month, day] = bogotaCalendarDate.format(now).split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, 23 + 5, 59, 59),
  ).toISOString();
}

/** Nobody reporting a gathering has a name for it. "Escombros en Chipre" is
 *  what the category and the barrio already say without asking anyone. */
function titleOf(
  category: CallCategory,
  neighborhood: string | null,
): string {
  return neighborhood
    ? `${CALL_CATEGORY_LABEL[category]} en ${neighborhood}`
    : CALL_CATEGORY_LABEL[category];
}
