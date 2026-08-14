import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/require-user";
import { clientEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  animalSchema,
  createAnimalSchema,
  type AnimalDTO,
} from "./animal.dto";
import {
  canReportAnimal,
  canResolveAnimal,
  canVerifyAnimal,
} from "./animal.policy";

const BUCKET = "animals";

/**
 * The only path from this application to `animal_report`.
 *
 * Private constructor and static factories, like every other DAL here, so an
 * instance cannot exist without a resolved authorization context.
 */
export class AnimalDAL {
  private constructor(private readonly user: CurrentUser | null) {}

  static async create(): Promise<AnimalDAL> {
    return new AnimalDAL(await getCurrentUser());
  }

  /** Read-only context for genuinely public data: the board anyone can open. */
  static public(): AnimalDAL {
    return new AnimalDAL(null);
  }

  /**
   * The live board: unresolved first, newest sighting first.
   *
   * Resolved reports are kept and shown last rather than hidden. "Ya apareció"
   * is the outcome everyone reading this board is hoping for, and seeing that
   * it happens is worth the row it occupies.
   */
  async listPublished(): Promise<AnimalDTO[]> {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("animal_report_public")
      .select("*")
      .eq("published", true)
      .order("resolved_at", { ascending: true, nullsFirst: true })
      .order("last_seen_at", { ascending: false });

    if (error) {
      log.error("animal.listPublished failed", { code: error.code });
      throw new Error("No se pudieron cargar los reportes de animales");
    }

    return (data ?? []).map((row) => this.toDTO(row));
  }

  /**
   * Uploads a photo and returns its storage path.
   *
   * Through the service role rather than from the browser: the bucket carries
   * no insert policy at all, which is what stops a public map from becoming a
   * place anyone can host any image. The file is downscaled on the client
   * before it gets here, so what crosses the wire is small.
   */
  async uploadPhoto(file: File): Promise<string> {
    if (!canReportAnimal()) throw new Error("Forbidden");

    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${crypto.randomUUID()}.${extension}`;

    const supabase = createAdminSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      log.error("animal.uploadPhoto failed", { reason: error.message });
      throw new Error("No se pudo subir la foto");
    }

    return path;
  }

  /**
   * Publishes a report. It is on the board immediately, marked unconfirmed.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async report(input: unknown): Promise<{ id: string }> {
    const data = createAnimalSchema.parse(input);

    if (!canReportAnimal()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { data: row, error } = await supabase
      .from("animal_report")
      .insert({
        kind: data.kind,
        species: data.species,
        pet_name: data.petName ?? null,
        description: data.description,
        photo_path: data.photoPath ?? null,
        last_seen_at: data.lastSeenAt,
        last_seen:
          data.longitude != null && data.latitude != null
            ? `SRID=4326;POINT(${data.longitude} ${data.latitude})`
            : null,
        zone: data.zone ?? null,
        whatsapp: data.whatsapp,
        created_by: this.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !row) {
      log.error("animal.report failed", { code: error?.code });
      throw new Error("No se pudo publicar el reporte");
    }

    log.info("animal reported", { animalId: row.id, kind: data.kind });
    return { id: row.id };
  }

  /** Marks an animal as home. Anyone may do this — see the policy. */
  async resolve(id: string): Promise<void> {
    if (!canResolveAnimal()) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("animal_report")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id)
      .is("resolved_at", null);

    if (error) {
      log.error("animal.resolve failed", { code: error.code, animalId: id });
      throw new Error("No se pudo marcar como encontrado");
    }
  }

  /** Records that a curator checked this against its source. */
  async verify(id: string): Promise<void> {
    if (!canVerifyAnimal(this.user)) throw new Error("Forbidden");

    const supabase = createAdminSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("animal_report")
      .update({ verified_by: this.user!.id, verified_at: now, confirmed_at: now })
      .eq("id", id);

    if (error) {
      log.error("animal.verify failed", { code: error.code, animalId: id });
      throw new Error("No se pudo verificar el reporte");
    }
  }

  /** Mapped explicitly, never spread. */
  private toDTO(row: Record<string, unknown>): AnimalDTO {
    const path = row.photo_path as string | null;

    return animalSchema.parse({
      id: row.id,
      kind: row.kind,
      species: row.species,
      petName: row.pet_name,
      description: row.description,
      // Built here rather than stored, so moving the bucket never means
      // rewriting rows.
      photoUrl: path
        ? `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
        : null,
      lastSeenAt: row.last_seen_at,
      longitude: row.longitude,
      latitude: row.latitude,
      zone: row.zone,
      whatsapp: row.whatsapp,
      resolvedAt: row.resolved_at,
      verified: row.verified,
      confirmedCount: row.confirmed_count,
      confirmedAt: row.confirmed_at,
    });
  }
}
