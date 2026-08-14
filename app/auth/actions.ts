"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Signing out lives here rather than under `data/`, and that is on purpose:
 * `data/` is the path to the database, and this touches only the session
 * cookies. Putting it in a DAL would blur the one rule that keeps queries in
 * one place.
 */
export async function signOut() {
  const supabase = await createServerSupabase();

  const { error } = await supabase.auth.signOut();
  if (error) log.error("auth.signOut failed", { reason: error.message });

  // The map renders differently for a signed-in user, so the cached shell has
  // to go with the session.
  revalidatePath("/", "layout");
  redirect("/");
}
