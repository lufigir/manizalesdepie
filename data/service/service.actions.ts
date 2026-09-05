"use server";

import type { ServiceDTO } from "./service.dto";
import { ServiceDAL } from "./service.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, hand back what
 * it returned. The DAL validates the input, authorizes the caller and
 * validates what comes back.
 */
export async function proposeService(input: {
  type: string;
  description: string;
  area: string;
  longitude?: number;
  latitude?: number;
  whatsapp: string;
}): Promise<ServiceDTO> {
  const dal = await ServiceDAL.create();
  return dal.propose(input);
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
  return dal.update(input);
}

export async function setServicePublished(id: string, published: boolean) {
  const dal = await ServiceDAL.create();
  return dal.setPublished(id, published);
}

export async function deleteService(id: string) {
  const dal = await ServiceDAL.create();
  await dal.remove(id);
}
