"use server";

import { revalidatePath } from "next/cache";

import { CallDAL } from "./call.dal";

/**
 * A server action compiles to a public POST endpoint. Anyone can call these
 * with a crafted request; arriving through our form is not a fact we get to
 * assume — and `joinCall` in particular is the kind of endpoint someone will
 * try to inflate.
 *
 * Which is why an action never checks anything itself. It orchestrates: build
 * the DAL, call it, revalidate. The DAL validates the input, authorizes the
 * caller and validates what comes back.
 */

export async function conveneCall(formData: FormData) {
  const dal = await CallDAL.create();

  const slots = formData.get("slotsTotal");

  const { id } = await dal.convene({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    longitude: Number(formData.get("longitude")),
    latitude: Number(formData.get("latitude")),
    meetingAddress: formData.get("meetingAddress") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    slotsTotal: slots ? Number(slots) : undefined,
    bring: formData.get("bring") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/** "Alguien ya se está juntando aquí." No account, no title, no hour. */
export async function gatherInformalCall(input: {
  category: string;
  description?: string;
  longitude: number;
  latitude: number;
  meetingAddress?: string;
}) {
  const dal = await CallDAL.create();
  const { id } = await dal.gather(input);

  revalidatePath("/");
  revalidatePath("/admin");
  return { id };
}

/** "Sigue por aquí, no allá." No account. Only moves within the pin's own
 *  barrio — see `CallDAL.relocateInformal`. */
export async function relocateInformalCall(input: {
  callId: string;
  longitude: number;
  latitude: number;
}) {
  const dal = CallDAL.public();
  await dal.relocateInformal(input);

  revalidatePath("/");
  return { ok: true };
}

/**
 * What is already convened near a point AND near an hour.
 *
 * Called before creating anything. A duplicate turned into a second volunteer
 * on the existing shift is worth more than either row: ten neighbours with
 * shovels split into two groups of five is the failure mode this prevents.
 */
export async function findNearbyCalls(
  longitude: number,
  latitude: number,
  startsAt: string,
) {
  const dal = CallDAL.public();
  return dal.findNearby(longitude, latitude, startsAt);
}

/** "Quiero participar". No account; the WhatsApp number is optional. */
export async function joinCall(input: {
  callId: string;
  whatsapp?: string;
  forTomorrow: boolean;
}) {
  const dal = await CallDAL.create();
  const result = await dal.join(input);

  // The counter on the card is server-rendered, so the number the next reader
  // sees has to move with the signup.
  revalidatePath("/");
  revalidatePath(`/grupo/${input.callId}`);
  return result;
}

export async function verifyCall(id: string) {
  const dal = await CallDAL.create();
  await dal.verify(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function adminUpdateCall(input: {
  id: string;
  title?: string;
  category?: string;
  description?: string;
  meetingAddress?: string;
  startsAt?: string;
  endsAt?: string;
  slotsTotal?: number;
  bring?: string;
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
