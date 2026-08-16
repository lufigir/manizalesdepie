"use server";

import { revalidatePath } from "next/cache";

import { WorkOrderDAL } from "./work_order.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, revalidate.
 *
 * `closeWorkOrder` used to be the counter-example that proved the rule: it
 * was reachable by anyone with a crafted request AND it wrote a terminal
 * status, so a loop over every case id could have emptied the map. It is a
 * curator's action now, and the ordinary way a case ends is a threshold the
 * database computes — see `sync_work_order_state`.
 */

export async function reportWorkOrder(input: {
  category: string;
  description: string;
  longitude: number;
  latitude: number;
  exactAddress?: string;
  contactName?: string;
  phone?: string;
  notes?: string;
}) {
  const dal = await WorkOrderDAL.create();
  const { id } = await dal.report(input);

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/**
 * One entry in a case's book: "voy", "ya ayudé", "sigue haciendo falta",
 * "esto no es real". Anonymous, signed with a name and a phone.
 *
 * Sends no status and cannot: the case's state is derived from every entry
 * on it, so this adds one voice to a count rather than deciding anything.
 */
export async function postWorkOrderUpdate(input: {
  workOrderId: string;
  kind: string;
  name?: string;
  phone?: string;
  note: string;
}) {
  const dal = WorkOrderDAL.public();
  await dal.postUpdate(input);
  // The card is server-rendered and the status may have just moved with this
  // entry, so the next reader has to see both.
  revalidatePath("/");
  revalidatePath(`/necesidad/${input.workOrderId}`);
}

/** Everything that has happened to a case, as a thread. */
export async function listWorkOrderUpdates(workOrderId: string) {
  const dal = WorkOrderDAL.public();
  return dal.listUpdates(workOrderId);
}

/** Curators only — see `canCloseWorkOrder`. The two verdicts a count cannot
 *  reach on its own. */
export async function closeWorkOrder(
  id: string,
  result: "closed_completed" | "closed_rejected",
) {
  const dal = await WorkOrderDAL.create();
  await dal.close(id, result);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateWorkOrder(input: {
  id: string;
  category?: string;
  description?: string;
}) {
  const dal = WorkOrderDAL.public();
  await dal.update(input);
  revalidatePath("/");
}

/**
 * Corrects a case's coordinate.
 *
 * No role check here, on purpose: the rule is about where the pin lands, not
 * about who the caller is, and it lives in the DAL. See `canRelocate`.
 */
export async function relocateWorkOrder(
  id: string,
  longitude: number,
  latitude: number,
) {
  const dal = await WorkOrderDAL.create();
  await dal.relocate({ id, longitude, latitude });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setWorkOrderPublished(id: string, published: boolean) {
  const dal = await WorkOrderDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

/** Curator-only — see `canDeleteWorkOrderUpdate`. Revalidates because the
 *  entry's removal recomputes the case's own status and counts. */
export async function deleteWorkOrderUpdate(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.removeUpdate(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
