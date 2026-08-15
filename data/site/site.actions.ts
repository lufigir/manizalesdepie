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
  });

  // Since publication is open, a proposal is on the map the moment it lands.
  // Revalidating only /admin would have left the reporter staring at a map
  // without the thing they just reported.
  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/**
 * What is already mapped near a point the reporter just placed.
 *
 * Called before creating anything, because duplication is the documented
 * number-one cause of congestion in citizen-reporting platforms — and because a
 * duplicate turned into a confirmation is worth more than either: it is what
 * moves an existing pin from "sin confirmar" to "confirmado".
 */
export async function findNearbySites(longitude: number, latitude: number) {
  const dal = SiteDAL.public();
  return dal.findNearby(longitude, latitude, 120);
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

export async function adminUpdateSite(input: {
  id: string;
  type?: string;
  name?: string;
  description?: string;
  address?: string;
  schedule?: string;
  whatsapp?: string;
}) {
  const dal = await SiteDAL.create();
  await dal.adminUpdate(input);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setSitePublished(id: string, published: boolean) {
  const dal = await SiteDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteSite(id: string) {
  const dal = await SiteDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
