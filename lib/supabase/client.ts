import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env";

/**
 * Browser client. Used for exactly two things:
 *  - starting the Google sign-in redirect,
 *  - subscribing to realtime channels for the live "HOY" counters.
 *
 * It carries only the publishable key and is bound by row-level security, so
 * whatever it can read, an anonymous visitor could read anyway. Nothing
 * sensitive is reachable from here: `work_order_contact` is excluded by policy
 * and is never published on a channel.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * Starts the PKCE redirect to Google.
 *
 * `redirectTo` is built from `window.location.origin`, not from
 * NEXT_PUBLIC_SITE_URL: the same build runs on localhost, on a per-commit
 * preview URL and in production, and hardcoding the production origin would
 * bounce every developer and every preview through the live site. The origins
 * still have to be allow-listed in Supabase — that list is the actual guard.
 *
 * `next` must already be a same-site absolute path (see `safeNext` in
 * `app/auth/safe-next.ts`, applied by every caller who reads it from the
 * query string). Returns true when the redirect started — false when Supabase
 * refused, in which case the caller is expected to say so instead of leaving
 * a spinner spinning forever.
 */
export async function startGoogleSignIn(next: string): Promise<boolean> {
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);

  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  return error === null;
}
