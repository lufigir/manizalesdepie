"use server";

import { revalidatePath } from "next/cache";

import { SiteDAL } from "./site.dal";

/**
 * A server action compiles to a POST endpoint. Anyone can call these with a
 * crafted request; arriving through our form is not a fact we get to assume.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, revalidate. The DAL validates the input, authorizes the
 * caller and validates what comes back. One place, no exceptions.
 */

export async function proposeSite(formData: FormData) {
  const dal = await SiteDAL.create();

  const { id } = await dal.propose({
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    address: formData.get("address") || undefined,
    longitude: Number(formData.get("longitude")),
    latitude: Number(formData.get("latitude")),
    schedule: formData.get("schedule") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    sourceUrl: formData.get("sourceUrl") || undefined,
  });

  revalidatePath("/admin");
  return { id };
}

export async function confirmSiteStatus(id: string, status: string) {
  const dal = await SiteDAL.create();
  await dal.confirmStatus({ id, status });
  revalidatePath("/");
}

export async function publishSite(id: string) {
  const dal = await SiteDAL.create();
  await dal.publish(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function verifySite(id: string) {
  const dal = await SiteDAL.create();
  await dal.verify(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
