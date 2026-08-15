"use server";

import { revalidatePath } from "next/cache";

import { WorkOrderDAL } from "./work_order.dal";

/**
 * A server action compiles to a public POST endpoint. It never checks
 * anything itself — it orchestrates: build the DAL, call it, revalidate.
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

/** "Yo puedo atender" — anonymous, with an optional note for whoever else
 *  is on the case. Returns nothing: the contact details it used to hand
 *  back are on the card already. */
export async function attendWorkOrder(input: {
  workOrderId: string;
  name: string;
  phone: string;
  note?: string;
}) {
  const dal = WorkOrderDAL.public();
  await dal.attend(input);
  revalidatePath("/");
}

/** Who is already on a case, with their notes. */
export async function listWorkOrderAttendees(workOrderId: string) {
  const dal = WorkOrderDAL.public();
  return dal.listAttendees(workOrderId);
}

export async function closeWorkOrder(
  id: string,
  result: "closed_completed" | "closed_by_others" | "closed_rejected",
) {
  const dal = WorkOrderDAL.public();
  await dal.close(id, result);
  revalidatePath("/");
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

export async function verifyWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.verify(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setWorkOrderPublished(id: string, published: boolean) {
  const dal = await WorkOrderDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
