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
