"use server";

import type { SiteDTO } from "./site.dto";
import { SiteDAL } from "./site.dal";

/**
 * A server action compiles to a POST endpoint. Anyone can call these with a
 * crafted request; arriving through our form is not a fact we get to assume.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, hand back what it returned. The DAL validates the input,
 * authorizes the caller and validates what comes back. One place, no
 * exceptions.
 *
 * What every one of them lost is `revalidatePath`. There is nothing to
 * revalidate: the server's answer is a fixed fixture and re-rendering it
 * would return the same rows plus, worse, discard what the reader just did.
 * A mutation's result travels back to the browser instead and lives there for
 * the visit — see `demo-store.tsx`.
 */

export async function proposeSite(formData: FormData): Promise<SiteDTO> {
  const dal = await SiteDAL.create();

  return dal.propose({
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    address: formData.get("address") || undefined,
    longitude: Number(formData.get("longitude")),
    latitude: Number(formData.get("latitude")),
    schedule: formData.get("schedule") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
  });
}

/**
 * What is already mapped near a point the reporter just placed.
 *
 * Called before creating anything, because duplication is the documented
 * number-one cause of congestion in citizen-reporting platforms — and because
 * a duplicate turned into a confirmation is worth more than either: it is
 * what moves an existing pin from "sin confirmar" to "confirmado".
 */
export async function findNearbySites(longitude: number, latitude: number) {
  const dal = SiteDAL.public();
  return dal.findNearby(longitude, latitude, 120);
}

export async function confirmSiteStatus(id: string, status: string) {
  const dal = await SiteDAL.create();
  return dal.confirmStatus({ id, status });
}

export async function publishSite(id: string) {
  const dal = await SiteDAL.create();
  return dal.publish(id);
}

/** Corrects a site's fields. No role check here — the rule is in the DAL,
 *  and it is open to anyone (see `canEditSite`). */
export async function updateSite(input: {
  id: string;
  type?: string;
  name?: string;
  description?: string;
  address?: string;
  schedule?: string;
  whatsapp?: string;
}) {
  const dal = await SiteDAL.create();
  return dal.update(input);
}

/**
 * Corrects a site's coordinate.
 *
 * No role check here, on purpose: the rule is about where the pin lands, not
 * about who the caller is, and it lives in the DAL with everything else that
 * decides. See `canRelocate`.
 */
export async function relocateSite(
  id: string,
  longitude: number,
  latitude: number,
) {
  const dal = await SiteDAL.create();
  return dal.relocate({ id, longitude, latitude });
}

export async function setSitePublished(id: string, published: boolean) {
  const dal = await SiteDAL.create();
  return dal.setPublished(id, published);
}

export async function deleteSite(id: string) {
  const dal = await SiteDAL.create();
  await dal.remove(id);
}
