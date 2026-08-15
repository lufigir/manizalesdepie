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

  revalidatePath("/ayudar");
  revalidatePath("/admin");
  return { id };
}

/** "Yo puedo atender" — anonymous. Returns the contact straight away; see
 *  `WorkOrderDAL.attend`. */
export async function attendWorkOrder(input: {
  workOrderId: string;
  name: string;
  phone: string;
}) {
  const dal = WorkOrderDAL.public();
  const result = await dal.attend(input);
  revalidatePath("/ayudar");
  return result;
}

export async function closeWorkOrder(
  id: string,
  result: "closed_completed" | "closed_by_others" | "closed_rejected",
) {
  const dal = WorkOrderDAL.public();
  await dal.close(id, result);
  revalidatePath("/ayudar");
}

export async function updateWorkOrder(input: {
  id: string;
  category?: string;
  description?: string;
}) {
  const dal = WorkOrderDAL.public();
  await dal.update(input);
  revalidatePath("/ayudar");
}

export async function verifyWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.verify(id);
  revalidatePath("/ayudar");
  revalidatePath("/admin");
}
