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
  /**
   * Where the photo is, or null.
   *
   * A plain string rather than `z.url()`, because neither of the two things
   * it now holds is an absolute URL: a fixture points at a file committed
   * under `/public`, and a photo added during a visit is a `data:` URL that
   * never leaves the browser it was chosen in. The Supabase Storage bucket
   * this used to resolve against is gone with the rest of the database.
   */
  photoUrl: z.string().nullable(),
  lastSeenAt: z.iso.datetime({ offset: true }),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  zone: z.string().nullable(),
  whatsapp: z.string(),
  /** Set once the animal is home. The row stays: a closed story tells the
   *  next reader that this one ended well. */
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
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
 * The photo arrives inline, as a `data:` URL the form built after shrinking
 * the file in the browser (see `compressImage`). It used to be uploaded to a
 * bucket first so that only a short path travelled inside the server action;
 * with no bucket to upload to, the bound that replaces that one is the size
 * cap below — a server action payload is not a file transport, and the demo
 * should refuse a 4 MB photo rather than fail obscurely on one.
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
  photoUrl: z
    .string()
    .trim()
    .max(900_000, "La foto es demasiado grande")
    .optional(),
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
export const updateAnimalSchema = z.object({
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

export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
