import { z } from "zod";

/**
 * Configuration is validated once, at module load, so a missing variable fails
 * the build instead of surfacing as a null pointer at 3am during an emergency.
 *
 * The split is deliberate:
 *  - `clientEnv` holds values that are safe in a browser bundle. Next inlines
 *    anything prefixed `NEXT_PUBLIC_`, so everything here is public by
 *    definition and must never hold a secret.
 *  - `serverEnv` is guarded by `server-only`: importing it from a client
 *    component is a build error, not a code review comment.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedClient.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsedClient.error)}`,
  );
}

export const clientEnv = parsedClient.data;
