"use server";

import { revalidatePath } from "next/cache";

import { AnimalDAL } from "./animal.dal";

/**
 * A server action compiles to a public POST endpoint. Anyone can call these
 * with a crafted request; arriving through our form is not a fact we get to
 * assume.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, revalidate. The DAL validates the input, authorizes the
 * caller and validates what comes back.
 */

export async function reportAnimal(formData: FormData) {
  const dal = await AnimalDAL.create();

  // The photo travels as a file and is stored first, so only its path — a
  // short string — goes into the row.
  const photo = formData.get("photo");
  const photoPath =
    photo instanceof File && photo.size > 0
      ? await dal.uploadPhoto(photo)
      : undefined;

  const longitude = formData.get("longitude");
  const latitude = formData.get("latitude");

  const { id } = await dal.report({
    kind: formData.get("kind"),
    species: formData.get("species"),
    petName: formData.get("petName") || undefined,
    description: formData.get("description"),
    photoPath,
    lastSeenAt: formData.get("lastSeenAt"),
    longitude: longitude ? Number(longitude) : undefined,
    latitude: latitude ? Number(latitude) : undefined,
    zone: formData.get("zone") || undefined,
    whatsapp: formData.get("whatsapp"),
  });

  revalidatePath("/");
  return { id };
}

export async function resolveAnimal(id: string) {
  const dal = await AnimalDAL.create();
  await dal.resolve(id);
  revalidatePath("/");
}

export async function verifyAnimal(id: string) {
  const dal = await AnimalDAL.create();
  await dal.verify(id);
  revalidatePath("/");
}
