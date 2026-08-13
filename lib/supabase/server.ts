import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env";

/**
 * Server client bound to the caller's session, so row-level security applies.
 * Use this to read as the user. It is the right client for anything a curator
 * or a claimant is allowed to see and an anonymous visitor is not.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The refresh already
            // happened in proxy.ts, so there is nothing to recover here.
          }
        },
      },
    },
  );
}
