"use server";

import type { AnimalDTO } from "./animal.dto";
import { AnimalDAL } from "./animal.dal";

/**
 * A server action compiles to a public POST endpoint. Anyone can call these
 * with a crafted request; arriving through our form is not a fact we get to
 * assume.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, hand back what it returned.
 *
 * `reportAnimal` no longer takes a `FormData` with a file in it. There is no
 * bucket to upload to, so the photo arrives already shrunk and encoded as a
 * `data:` URL — see `compressImage` and `animal-form.tsx`.
 */
export async function reportAnimal(input: {
  kind: string;
  species: string;
  petName?: string;
  description: string;
  photoUrl?: string;
  lastSeenAt: string;
  longitude?: number;
  latitude?: number;
  zone?: string;
  whatsapp: string;
}): Promise<AnimalDTO> {
  const dal = await AnimalDAL.create();
  return dal.report(input);
}

export async function resolveAnimal(id: string) {
  const dal = await AnimalDAL.create();
  return dal.resolve(id);
}

/** Corrects a report's fields. Open to anyone — see `canEditAnimal`. */
export async function updateAnimal(input: {
  id: string;
  kind?: string;
  species?: string;
  petName?: string;
  description?: string;
  zone?: string;
  whatsapp?: string;
}) {
  const dal = await AnimalDAL.create();
  return dal.update(input);
}

export async function setAnimalPublished(id: string, published: boolean) {
  const dal = await AnimalDAL.create();
  return dal.setPublished(id, published);
}

export async function deleteAnimal(id: string) {
  const dal = await AnimalDAL.create();
  await dal.remove(id);
}
