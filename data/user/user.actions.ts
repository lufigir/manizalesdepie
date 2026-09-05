"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { DEMO_ROLE_COOKIE } from "./current-user";

/**
 * Puts the curator's hat on, or takes it off.
 *
 * The demo's stand-in for signing in, and the only mutation in this app that
 * writes a cookie rather than data. It lives under `data/user/` beside the
 * thing that reads it, because the two halves of one decision drifting apart
 * is how a role check ends up meaning something different on each side.
 *
 * Everything the role unlocks is still decided in a policy and enforced in a
 * DAL — see `canManageSite`, `canCloseNeed`. This only says which hat the
 * next request arrives wearing.
 */
export async function setDemoRole(role: "curator" | "visitor") {
  const store = await cookies();

  if (role === "curator") {
    store.set(DEMO_ROLE_COOKIE, "curator", {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24,
    });
  } else {
    store.delete(DEMO_ROLE_COOKIE);
  }

  // Every card renders differently under the hat — the hidden rows appear,
  // the curator strips appear — and all of it is server-rendered.
  revalidatePath("/", "layout");
}
