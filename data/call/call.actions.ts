"use server";

import { revalidatePath } from "next/cache";

import { CallDAL } from "./call.dal";

/**
 * A server action compiles to a public POST endpoint. Anyone can call these
 * with a crafted request; arriving through our form is not a fact we get to
 * assume.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, revalidate. The DAL validates the input, authorizes the
 * caller and validates what comes back.
 */

/** "Alguien se está juntando aquí." No account. */
export async function createCall(input: {
  category: string;
  description?: string;
  longitude: number;
  latitude: number;
  meetingAddress?: string;
  whatsapp?: string;
}) {
  const dal = await CallDAL.create();
  const { id } = await dal.gather(input);

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/** "Sigue por aquí, no allá." No account. Only moves within the pin's own
 *  barrio — see `CallDAL.relocate`. */
export async function relocateCall(input: {
  callId: string;
  longitude: number;
  latitude: number;
}) {
  const dal = CallDAL.public();
  await dal.relocate(input);

  revalidatePath("/");
  return { ok: true };
}

/**
 * What is already reported near a point AND near an hour.
 *
 * Called before creating anything. A duplicate turned into a second pair of
 * hands on the existing pin is worth more than either row: ten neighbours
 * with shovels split into two groups of five is the failure mode this
 * prevents.
 */
export async function findNearbyCalls(
  longitude: number,
  latitude: number,
  startsAt: string,
) {
  const dal = CallDAL.public();
  return dal.findNearby(longitude, latitude, startsAt);
}

export async function adminUpdateCall(input: {
  id: string;
  category?: string;
  description?: string;
  meetingAddress?: string;
  startsAt?: string;
  whatsapp?: string;
}) {
  const dal = await CallDAL.create();
  await dal.adminUpdate(input);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setCallPublished(id: string, published: boolean) {
  const dal = await CallDAL.create();
  await dal.setPublished(id, published);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteCall(id: string) {
  const dal = await CallDAL.create();
  await dal.remove(id);
  revalidatePath("/");
  revalidatePath("/admin");
}
