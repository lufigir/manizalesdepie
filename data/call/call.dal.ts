import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  attendeeSchema,
  callSchema,
  createCallSchema,
  joinCallSchema,
  type AttendeeDTO,
  type CallDTO,
} from "./call.dto";
import {
  canCreateCall,
  canJoinCall,
  canSeeAttendees,
  canVerifyCall,
} from "./call.policy";

/** Postgres check-constraint violation. Raised by `call_slots_within_total`
 *  when two people take the last slot in the same instant. */
const CHECK_VIOLATION = "23514";

/** A shift with no stated end. Long enough to cover a working day, short enough
 *  that a jornada convened this morning is off the map by tonight. */
const DEFAULT_SHIFT_HOURS = 6;

/**
 * The only path from this application to `volunteer_call` and
 * `call_attendance`.
 *
 * Private constructor and static factories, like every other DAL here, so an
 * instance cannot exist without a resolved authorization context. That matters
 * more in this module than anywhere else: one of its methods reads other
 * people's phone numbers.
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
   * Filtered by `expires_at` rather than by `starts_at`, so a brigade already
   * under way stays on the map — turning up an hour late to a shift that runs
   * all morning is help, not a mistake. Once it is over it drops off on its
   * own: a call is the one thing here that genuinely stops existing, which is
   * different from a site going stale.
   */
  async listPublished(): Promise<CallDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("volunteer_call_public")
      .select("*")
      .eq("published", true)
      .gt("expires_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (error) {
      log.error("call.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar las jornadas");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * One call, or null. What a shared link resolves to.
   *
   * Not filtered by `expires_at`: a link posted in a WhatsApp group outlives the
   * shift it points at, and "esa jornada ya terminó" is a better answer than a
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
      throw new Error("No se pudo cargar la jornada");
    }

    return data ? this.toDTO(data) : null;
  }

  /**
   * Calls near a point AND near an hour, nearest first.
   *
   * Both halves are required. Two shifts in the same park on different days are
   * two real things; merging them by distance alone would send people on the
   * wrong day, which is worse than a duplicate pin.
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
      throw new Error("No se pudo verificar si ya hay una jornada parecida");
    }

    return (data ?? []).map(
      (row: {
        id: string;
        title: string;
        starts_at: string;
        distance_m: number;
      }) => ({
        id: row.id,
        title: row.title,
        startsAt: row.starts_at,
        distanceM: Math.round(row.distance_m),
      }),
    );
  }

  /**
   * Convenes a shift. On the map immediately, like everything else here.
   *
   * The account check is the only one of its kind in this application. It is
   * not about trusting the information — an anonymous report of an acopio is
   * accepted without argument — it is about the phone numbers this row is about
   * to start collecting.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async convene(input: unknown): Promise<{ id: string }> {
    const data = createCallSchema.parse(input);

    if (!canCreateCall(this.user)) {
      throw new Error("Necesitas una cuenta para convocar una jornada");
    }

    const supabase = createAdminSupabase();
    const { data: row, error } = await supabase
      .from("volunteer_call")
      .insert({
        title: data.title,
        category: data.category,
        description: data.description ?? null,
        meeting_point: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
        meeting_address: data.meetingAddress ?? null,
        starts_at: data.startsAt,
        ends_at: data.endsAt ?? null,
        slots_total: data.slotsTotal ?? null,
        bring: data.bring ?? null,
        whatsapp: data.whatsapp ?? null,
        published: true,
        // Derived rather than asked for. A call expires when it is over, which
        // the organiser already told us; asking a second time for the same fact
        // in different words is how forms get abandoned.
        expires_at: expiryOf(data.startsAt, data.endsAt),
        created_by: this.user!.id,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("call.convene failed", { code: error?.code });
      throw new Error("No se pudo publicar la jornada");
    }

    log.info("call convened", { callId: row.id, byUser: this.user!.id });
    return { id: row.id };
  }

  /**
   * "Quiero participar". No account, one optional field.
   *
   * The unique index only covers signed-in volunteers, so `alreadyJoined` is
   * the honest answer for them and never for an anonymous one — there is
   * nothing to deduplicate an anonymous signup by, and blocking a real
   * volunteer to avoid double-counting one would be the wrong trade.
   *
   * Capacity is checked here for the message and enforced in the database by
   * `call_slots_within_total`, which is what actually holds when two people tap
   * at the same instant.
   */
  async join(input: unknown): Promise<{ alreadyJoined: boolean }> {
    const data = joinCallSchema.parse(input);

    if (!canJoinCall()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();

    const { error } = await supabase.from("call_attendance").insert({
      volunteer_call_id: data.callId,
      profile_id: this.user?.id ?? null,
      whatsapp: data.whatsapp ?? null,
      for_tomorrow: data.forTomorrow,
    });

    if (error?.code === "23505") {
      // The one-per-profile index. Tapping twice is not an error worth showing.
      return { alreadyJoined: true };
    }

    if (error?.code === CHECK_VIOLATION) {
      throw new Error("Ya se llenaron los cupos de esta jornada");
    }

    if (error) {
      log.error("call.join failed", { code: error.code, callId: data.callId });
      throw new Error("No se pudo apuntar. Intenta otra vez.");
    }

    log.info("call joined", {
      callId: data.callId,
      forTomorrow: data.forTomorrow,
      withContact: data.whatsapp !== undefined,
    });
    return { alreadyJoined: false };
  }

  /**
   * Who signed up. The organiser and curators only.
   *
   * This is the whole reason the account is required upstream: these numbers
   * belong to people who handed them over so one specific person could tell
   * them where to meet, and nobody else has any business reading them.
   */
  async listAttendees(callId: string): Promise<AttendeeDTO[]> {
    const call = await this.findById(callId);
    if (!call) return [];

    if (!canSeeAttendees(this.user, call)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("call_attendance")
      .select("id, whatsapp, for_tomorrow, created_at")
      .eq("volunteer_call_id", callId)
      .order("created_at", { ascending: true });

    if (error) {
      log.error("call.listAttendees failed", { code: error.code, callId });
      throw new Error("No se pudo cargar quién se apuntó");
    }

    return (data ?? []).map((row) =>
      attendeeSchema.parse({
        id: row.id,
        whatsapp: row.whatsapp,
        forTomorrow: row.for_tomorrow,
        createdAt: row.created_at,
      }),
    );
  }

  /** Records that a curator checked this against its source. */
  async verify(id: string): Promise<void> {
    if (!canVerifyCall(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("volunteer_call")
      .update({ verified_by: this.user!.id, verified_at: now, confirmed_at: now })
      .eq("id", id);

    if (error) {
      log.error("call.verify failed", { code: error.code, callId: id });
      throw new Error("No se pudo verificar la jornada");
    }
  }

  /** Mapped explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): CallDTO {
    return callSchema.parse({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      meetingAddress: row.meeting_address,
      neighborhood: row.neighborhood,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      slotsTotal: row.slots_total,
      slotsTaken: row.slots_taken,
      bring: row.bring,
      whatsapp: row.whatsapp,
      verified: row.verified,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
      expiresAt: row.expires_at,
      createdById: row.created_by,
    });
  }
}

/** When a shift stops being worth showing: its stated end, or a working day
 *  after it starts when the organiser did not say. */
function expiryOf(startsAt: string, endsAt?: string): string {
  if (endsAt) return endsAt;
  return new Date(
    new Date(startsAt).getTime() + DEFAULT_SHIFT_HOURS * 60 * 60 * 1000,
  ).toISOString();
}
