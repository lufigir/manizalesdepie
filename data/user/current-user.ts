import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: "visitor" | "contributor" | "curator";
};

/**
 * Who is reading, or null for an anonymous visitor.
 *
 * There is no sign-in any more. The live version resolved a Google session
 * through Supabase Auth and read a `profiles` row for the role; this demo has
 * neither an identity provider nor a database, and inventing one for a
 * portfolio piece would be a login screen guarding nothing.
 *
 * What survives is the half that was load-bearing: the ROLE. Every policy in
 * `data/**` decides on it, the curator-only strips on the cards read it, and
 * a visitor who cannot see those never finds out that half the product
 * exists. So the demo lets anyone put the curator's hat on — `AccountMenu`
 * offers it — and this is where that choice is resolved, server-side, off a
 * cookie, before any DAL is built.
 *
 * The cookie is not a credential and is not treated as one: it grants a role
 * over invented data that resets on reload. It is written by one server
 * action (`setDemoRole`) so the switch behaves like every other mutation
 * here, and read here so the authorization context still exists exactly once
 * per request, ahead of everything that depends on it.
 */
export const DEMO_ROLE_COOKIE = "mdp_demo_role";

/** The persona behind the curator hat. Named as what it is, in the panel and
 *  in the account bubble, so nobody mistakes it for an account. */
const DEMO_CURATOR: CurrentUser = {
  id: "00000000-0000-5000-8000-000000000cca",
  email: null,
  fullName: "Curador de la demo",
  avatarUrl: null,
  role: "curator",
};

/**
 * Wrapped in React's per-render cache so a page, its header and a widget all
 * resolve the reader once. A per-render-pass cache, not a time-based one, so
 * there is no stale hazard.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();

  return store.get(DEMO_ROLE_COOKIE)?.value === "curator" ? DEMO_CURATOR : null;
});
