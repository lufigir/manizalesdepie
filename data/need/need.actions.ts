"use server";

import type { NeedDTO, NeedUpdateDTO } from "./need.dto";
import { NeedDAL } from "./need.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, hand back what
 * it returned.
 *
 * `closeNeed` used to be the counter-example that proved the rule: it was
 * reachable by anyone with a crafted request AND it wrote a terminal status,
 * so a loop over every case id could have emptied the map. It is a curator's
 * action now, and the ordinary state of a case is derived from its own
 * thread — see `deriveNeedState`.
 */

export async function reportNeed(input: {
  category: string;
  description: string;
  longitude: number;
  latitude: number;
  exactAddress?: string;
  contactName?: string;
  phone?: string;
  notes?: string;
}): Promise<NeedDTO> {
  const dal = await NeedDAL.create();
  return dal.report(input);
}

/**
 * One entry in a case's book: "voy", "ya ayudé", "sigue haciendo falta",
 * "esto no es real". Anonymous, optionally signed with a name and a phone.
 *
 * Returns the entry and no status: the case's state is derived from every
 * entry on it, so this adds one voice to a count rather than deciding
 * anything.
 */
export async function postNeedUpdate(input: {
  needId: string;
  kind: string;
  name?: string;
  phone?: string;
  note: string;
}): Promise<NeedUpdateDTO> {
  const dal = NeedDAL.public();
  return dal.postUpdate(input);
}

/** Everything that has happened to a case, as a thread. */
export async function listNeedUpdates(needId: string) {
  const dal = NeedDAL.public();
  return dal.listUpdates(needId);
}

/** Curators only — see `canCloseNeed`. The two verdicts a count cannot
 *  reach on its own. */
export async function closeNeed(
  id: string,
  result: "closed_completed" | "closed_rejected",
) {
  const dal = await NeedDAL.create();
  return dal.close(id, result);
}

export async function updateNeed(input: {
  id: string;
  category?: string;
  description?: string;
}) {
  const dal = NeedDAL.public();
  return dal.update(input);
}

/**
 * Corrects a case's coordinate.
 *
 * No role check here, on purpose: the rule is about where the pin lands, not
 * about who the caller is, and it lives in the DAL. See `canRelocate`.
 */
export async function relocateNeed(
  id: string,
  longitude: number,
  latitude: number,
) {
  const dal = await NeedDAL.create();
  return dal.relocate({ id, longitude, latitude });
}

export async function setNeedPublished(id: string, published: boolean) {
  const dal = await NeedDAL.create();
  return dal.setPublished(id, published);
}

/** Curator-only — see `canDeleteNeedUpdate`. */
export async function deleteNeedUpdate(id: string) {
  const dal = await NeedDAL.create();
  await dal.removeUpdate(id);
}

export async function deleteNeed(id: string) {
  const dal = await NeedDAL.create();
  await dal.remove(id);
}
