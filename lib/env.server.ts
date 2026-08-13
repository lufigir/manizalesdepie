import "server-only";

import { z } from "zod";

/**
 * Server-side configuration. The `server-only` import above turns an accidental
 * client import into a build error rather than a leaked service key.
 */

const serverSchema = z.object({
  /** Full-access key. Only the data layer may use it, and only after it has
   *  authorized the caller itself — it bypasses row-level security. */
  SUPABASE_SECRET_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = serverSchema.safeParse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;
