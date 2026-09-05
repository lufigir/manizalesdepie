import "server-only";

import { getCurrentUser, type CurrentUser } from "@/data/user/current-user";
import { log } from "@/lib/log";
import { animals as animalRows, type AnimalRow } from "@/lib/demo/dataset";

import {
  animalSchema,
  createAnimalSchema,
  updateAnimalSchema,
  type AnimalDTO,
} from "./animal.dto";
import {
  canEditAnimal,
  canManageAnimal,
  canReportAnimal,
  canResolveAnimal,
} from "./animal.policy";

/**
 * The only path from this application to the animal reports.
 *
 * Private constructor and static factories, like every other DAL here, so an
 * instance cannot exist without a resolved authorization context.
 *
 * The photo is the one thing that changed shape rather than backend. It used
 * to be uploaded to a Supabase Storage bucket through the service role, and
 * the row carried a path this class turned into a public URL. There is no
 * bucket now: the fixtures point at files committed under `/public`, and a
 * photo somebody adds during a visit travels as a data URL and never leaves
 * their browser. Which is why `uploadPhoto` is gone rather than stubbed —
 * there is nothing left for it to do.
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
   * Resolved reports are kept and shown last rather than hidden. "Ya
   * apareció" is the outcome everyone reading this board is hoping for, and
   * seeing that it happens is worth the row it occupies.
   */
  async listPublished(): Promise<AnimalDTO[]> {
    const curator = this.user?.role === "curator";

    return animalRows()
      .filter((row) => curator || row.published)
      .sort((a, b) => {
        if ((a.resolvedAt === null) !== (b.resolvedAt === null)) {
          return a.resolvedAt === null ? -1 : 1;
        }
        return b.lastSeenAt.localeCompare(a.lastSeenAt);
      })
      .map((row) => this.toDTO(row));
  }

  /**
   * One report, or null. What `/mascota/[id]` resolves to.
   *
   * No filter on `resolvedAt`: a link to a dog that turned up should say so
   * rather than 404 — "ya está en casa" is the answer the group was waiting
   * for, and it is the card's job to deliver it.
   */
  async findById(id: string): Promise<AnimalDTO | null> {
    const curator = this.user?.role === "curator";
    const row = animalRows().find((candidate) => candidate.id === id);

    if (!row || (!row.published && !curator)) return null;

    return this.toDTO(row);
  }

  /**
   * Publishes a report. It is on the board immediately.
   *
   * Order, in every mutation, without exception:
   *   1. validate input   2. authorize   3. mutate   4. validate output
   */
  async report(input: unknown): Promise<AnimalDTO> {
    const data = createAnimalSchema.parse(input);

    if (!canReportAnimal()) throw new Error("Forbidden");

    const animal = animalSchema.parse({
      id: crypto.randomUUID(),
      kind: data.kind,
      species: data.species,
      petName: data.petName ?? null,
      description: data.description,
      photoUrl: data.photoUrl ?? null,
      lastSeenAt: data.lastSeenAt,
      longitude: data.longitude ?? null,
      latitude: data.latitude ?? null,
      zone: data.zone ?? null,
      whatsapp: data.whatsapp,
      resolvedAt: null,
      confirmedAt: new Date().toISOString(),
      published: true,
    });

    log.info("animal reported", { animalId: animal.id, kind: data.kind });
    return animal;
  }

  /** Marks an animal as home. Anyone may do this — see the policy. */
  async resolve(id: string): Promise<Partial<AnimalDTO>> {
    if (!canResolveAnimal()) throw new Error("Forbidden");

    log.info("animal resolved", { animalId: id });
    return { resolvedAt: new Date().toISOString() };
  }

  /** Corrects a report's own fields. Open to anyone — see `canEditAnimal`.
   *  Never the photo or the coordinate: see `updateAnimalSchema`. */
  async update(input: unknown): Promise<Partial<AnimalDTO>> {
    const data = updateAnimalSchema.parse(input);

    if (!canEditAnimal()) throw new Error("Forbidden");

    const patch: Partial<AnimalDTO> = {};
    if (data.kind !== undefined) patch.kind = data.kind;
    if (data.species !== undefined) patch.species = data.species;
    if (data.petName !== undefined) patch.petName = data.petName;
    if (data.description !== undefined) patch.description = data.description;
    if (data.zone !== undefined) patch.zone = data.zone;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;

    log.info("animal updated", {
      animalId: data.id,
      fields: Object.keys(patch),
      byUser: this.user?.id ?? "anon",
    });

    return patch;
  }

  /** A curator hides or republishes a report — reversible, the same
   *  `published` flag every list filters by. */
  async setPublished(
    id: string,
    published: boolean,
  ): Promise<Partial<AnimalDTO>> {
    if (!canManageAnimal(this.user)) throw new Error("Forbidden");

    log.info("animal visibility changed", {
      animalId: id,
      published,
      byUser: this.user!.id,
    });
    return { published };
  }

  /** Removing a report outright — curators only, for spam and test rows. */
  async remove(id: string): Promise<void> {
    if (!canManageAnimal(this.user)) throw new Error("Forbidden");

    log.info("animal deleted", { animalId: id, byUser: this.user!.id });
  }

  /** Mapped explicitly, never spread. */
  private toDTO(row: AnimalRow): AnimalDTO {
    return animalSchema.parse({
      id: row.id,
      kind: row.kind,
      species: row.species,
      petName: row.petName,
      description: row.description,
      photoUrl: row.photoUrl,
      lastSeenAt: row.lastSeenAt,
      longitude: row.longitude,
      latitude: row.latitude,
      zone: row.zone,
      whatsapp: row.whatsapp,
      resolvedAt: row.resolvedAt,
      confirmedAt: row.confirmedAt,
      published: row.published,
    });
  }
}
