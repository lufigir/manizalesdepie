"use server";

import { revalidatePath } from "next/cache";

import { ResourceOfferDAL } from "./resource_offer.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, revalidate. The
 * DAL validates the input, authorizes the caller and validates what comes
 * back.
 */
export async function proposeResourceOffer(input: {
  type: string;
  description: string;
  quantity?: number;
  area: string;
  longitude?: number;
  latitude?: number;
  whatsapp: string;
  availableFrom?: string;
  availableUntil?: string;
}) {
  const dal = await ResourceOfferDAL.create();
  const { id } = await dal.propose(input);

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

export async function verifyResourceOffer(id: string) {
  const dal = await ResourceOfferDAL.create();
  await dal.verify(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function adminUpdateResourceOffer(input: {
  id: string;
  type?: string;
  description?: string;
  quantity?: number;
  area?: string;
  whatsapp?: string;
  availableFrom?: string;
  availableUntil?: string;
}) {
  const dal = await ResourceOfferDAL.create();
  await dal.adminUpdate(input);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setResourceOfferPublished(id: string, published: boolean) {
  const dal = await ResourceOfferDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteResourceOffer(id: string) {
  const dal = await ResourceOfferDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
