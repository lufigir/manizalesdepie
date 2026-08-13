import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Full-access client. It bypasses row-level security entirely.
 *
 * Only a `*.dal.ts` file may import this, and only after it has authorized the
 * caller through its own policy functions. The lint rule in `eslint.config.mjs`
 * enforces the first half; the ordering inside every mutation — validate,
 * authorize, mutate, validate — enforces the second.
 *
 * If you are reading data on behalf of a user, you want `createServerSupabase`
 * instead, so the database checks the policy for you.
 */
export function createAdminSupabase() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
