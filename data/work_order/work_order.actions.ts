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

export async function claimWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.claim(id);
  revalidatePath("/ayudar");
}

export async function closeWorkOrder(
  id: string,
  result: "closed_completed" | "closed_by_others" | "closed_rejected",
) {
  const dal = await WorkOrderDAL.create();
  await dal.close(id, result);
  revalidatePath("/ayudar");
}

/** The exact address and phone — only for whoever holds the claim, or a
 *  curator. Every call is a logged read; see `WorkOrderDAL.getContact`. */
export async function getWorkOrderContact(id: string) {
  const dal = await WorkOrderDAL.create();
  return dal.getContact(id);
}

export async function verifyWorkOrder(id: string) {
  const dal = await WorkOrderDAL.create();
  await dal.verify(id);
  revalidatePath("/ayudar");
  revalidatePath("/admin");
}
