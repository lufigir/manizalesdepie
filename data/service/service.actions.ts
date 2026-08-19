"use server";

import { revalidatePath } from "next/cache";

import { ServiceDAL } from "./service.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, revalidate. The
 * DAL validates the input, authorizes the caller and validates what comes
 * back.
 */
export async function proposeService(input: {
  type: string;
  description: string;
  area: string;
  longitude?: number;
  latitude?: number;
  whatsapp: string;
}) {
  const dal = await ServiceDAL.create();
  const { id } = await dal.propose(input);

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/** Corrects a service's fields. Open to anyone — see `canEditService`. */
export async function updateService(input: {
  id: string;
  type?: string;
  description?: string;
  area?: string;
  whatsapp?: string;
}) {
  const dal = await ServiceDAL.create();
  await dal.update(input);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setServicePublished(id: string, published: boolean) {
  const dal = await ServiceDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteService(id: string) {
  const dal = await ServiceDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
