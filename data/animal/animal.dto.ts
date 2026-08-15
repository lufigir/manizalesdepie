import { z } from "zod";

/**
 * The contract for an animal report.
 *
 * The shape differs from every other entity here in one way that matters:
 * the coordinate is optional. A lost animal has no location — that is what
 * "lost" means — so the schema refuses to pretend otherwise. What it has is a
 * last sighting, and a photo, which is the field that actually reunites it.
 */

export const ANIMAL_KINDS = ["lost", "found", "sighted"] as const;
export const ANIMAL_SPECIES = ["dog", "cat", "other"] as const;

export const animalKindSchema = z.enum(ANIMAL_KINDS);
export const animalSpeciesSchema = z.enum(ANIMAL_SPECIES);

export type AnimalKind = z.infer<typeof animalKindSchema>;
export type AnimalSpecies = z.infer<typeof animalSpeciesSchema>;

export const animalSchema = z.object({
  id: z.uuid(),
  kind: animalKindSchema,
  species: animalSpeciesSchema,
  petName: z.string().nullable(),
  description: z.string(),
  /** Public URL of the photo, already resolved from the storage path. */
  photoUrl: z.url().nullable(),
  lastSeenAt: z.iso.datetime({ offset: true }),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  zone: z.string().nullable(),
  whatsapp: z.string(),
  /** Set once the animal is home. The row stays: a closed story tells the
   *  next reader that this one ended well. */
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
  verified: z.boolean(),
  confirmedCount: z.number().int().min(0),
  confirmedAt: z.iso.datetime({ offset: true }),
  /** Read by `AdminActions` for the "Ocultar"/"Publicar" toggle — a
   *  curator-only fact; `listPublished` only returns a hidden row at all
   *  when the caller is a curator. */
  published: z.boolean(),
});

export type AnimalDTO = z.infer<typeof animalSchema>;

/**
 * What the public form may submit.
 *
 * The photo is not in here: it is uploaded separately and only its path
 * arrives, so a multi-megabyte file never travels inside a server action.
 */
export const createAnimalSchema = z.object({
  kind: animalKindSchema,
  species: animalSpeciesSchema,
  petName: z.string().trim().max(60).optional(),
  description: z
    .string()
    .trim()
    .min(10, "Describe cómo reconocerlo: color, tamaño, collar")
    .max(600),
  photoPath: z.string().trim().max(300).optional(),
  lastSeenAt: z.iso.datetime({ offset: true }),
  // Bounded to Manizales–Villamaría like every other coordinate here, but
  // optional throughout: someone may only know the barrio.
  longitude: z.number().min(-76.2).max(-74.8).optional(),
  latitude: z.number().min(4.6).max(5.6).optional(),
  zone: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Solo dígitos, con indicativo del país"),
});

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;

/** A curator correcting any of a report's own fields. Not the photo or the
 *  coordinate: replacing a photo needs the upload flow, and the point is
 *  read directly off where the animal was actually seen. */
export const adminUpdateAnimalSchema = z.object({
  id: z.uuid(),
  kind: animalKindSchema.optional(),
  species: animalSpeciesSchema.optional(),
  petName: z.string().trim().max(60).optional(),
  description: z.string().trim().min(10).max(600).optional(),
  zone: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Solo dígitos, con indicativo del país")
    .optional(),
});

export type AdminUpdateAnimalInput = z.infer<typeof adminUpdateAnimalSchema>;
