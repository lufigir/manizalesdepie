import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  /** The Google profile picture, if the provider sent one. Read off the
   *  access-token claims, not the `profile` row: it is provider data, and
   *  the JWT is refreshed with the provider's latest copy. */
  avatarUrl: string | null;
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

  let meta = claims?.claims.user_metadata;
  let email =
    typeof claims?.claims.email === "string" ? claims.claims.email : null;

  // `getClaims()` verifies the token locally when the project signs with an
  // asymmetric key, and falls back to the Auth server otherwise. Only the
  // first path is guaranteed to carry `user_metadata`, and the fallback is
  // exactly what left the account bubble with no photo and no name. Ask the
  // Auth server for the profile when the token did not bring one — one extra
  // round trip, on the path that was broken, inside a per-render cache.
  if (!readAvatar(meta)) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      meta = data.user.user_metadata;
      email = data.user.email ?? email;
    }
  }

  const avatarUrl = readAvatar(meta);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  /**
   * A session with no `profile` row still identifies somebody.
   *
   * Returning null here read as "signed out" everywhere — the bubble kept
   * offering "Entrar" to a reader who had just come back from Google, with no
   * way to tell the two states apart. The row is normally written by the
   * `on_auth_user_created` trigger, so this is the account that predates the
   * trigger, or one whose insert lost a race with the first page render.
   * Degrade to `visitor`: it grants nothing, and it is honest about the
   * session existing.
   */
  return {
    id: userId,
    email,
    fullName: profile?.full_name ?? readName(meta) ?? email ?? "Anónimo",
    avatarUrl,
    role: profile?.role ?? "visitor",
  };
});

type Metadata = Record<string, unknown> | undefined;

/** Google names the photo `avatar_url`; the OIDC field it came from is
 *  `picture`. Read either, so a provider that maps differently still works. */
function readAvatar(meta: Metadata): string | null {
  for (const key of ["avatar_url", "picture"] as const) {
    const value = meta?.[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function readName(meta: Metadata): string | null {
  for (const key of ["full_name", "name"] as const) {
    const value = meta?.[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

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
