import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  role: "visitor" | "contributor" | "curator";
};

/**
 * The identity of the caller, or null. Never throws.
 *
 * Wrapped in React's per-render cache so a page, its header and a widget all
 * resolve the session once. This is a per-render-pass cache, not a time-based
 * one, so there is no stale-session hazard.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  return {
    id: userId,
    email: typeof claims?.claims.email === "string" ? claims.claims.email : null,
    fullName: profile.full_name,
    role: profile.role,
  };
});

/** Guarantees a session. Everything downstream may assume a user exists. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** Guarantees a curator. Used by the /admin surfaces and by curator-only
 *  mutations such as publishing or merging. */
export async function requireCurator(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "curator") redirect("/");
  return user;
}
