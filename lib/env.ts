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
  /** Public WhatsApp line curators staff, shown across the whole app so that
   *  affected people — who are not the ones using this app — have a way in. */
  NEXT_PUBLIC_CURATOR_WHATSAPP: z.string().regex(/^\d{10,15}$/),
});

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CURATOR_WHATSAPP: process.env.NEXT_PUBLIC_CURATOR_WHATSAPP,
});

if (!parsedClient.success) {
  throw new Error(
    `Invalid public environment variables:\n${z.prettifyError(parsedClient.error)}`,
  );
}

export const clientEnv = parsedClient.data;
