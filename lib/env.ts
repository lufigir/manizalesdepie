import { z } from "zod";

/**
 * The one piece of configuration left.
 *
 * There used to be five variables here, split into a public half and a
 * `server-only` half so a secret could not cross into the browser bundle.
 * Four of them were Supabase's; with the database gone, so are they, and the
 * demo builds and runs with no environment at all.
 *
 * What remains is the site's own origin, which cannot be dropped: every
 * `opengraph-image.tsx` in this app resolves to a RELATIVE url, and without
 * an absolute base Next cannot give WhatsApp or Twitter the image — the card
 * silently renders with none, which is the failure nobody notices until a
 * link is already circulating.
 *
 * Read only from Server Components (`app/layout.tsx`, the four share routes,
 * `robots.ts`, `sitemap.ts`). That is what lets the Vercel fallback work:
 * `VERCEL_PROJECT_PRODUCTION_URL` is not a `NEXT_PUBLIC_` variable, so it
 * exists on the server and would be undefined in a browser bundle. Set
 * `NEXT_PUBLIC_SITE_URL` to override it — on a custom domain, that is the
 * only way to be right.
 */
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const parsed = z
  .url()
  .safeParse(
    process.env.NEXT_PUBLIC_SITE_URL ?? fromVercel ?? "http://localhost:3000",
  );

if (!parsed.success) {
  throw new Error(
    `NEXT_PUBLIC_SITE_URL no es una URL válida:\n${z.prettifyError(parsed.error)}`,
  );
}

export const SITE_URL = parsed.data;
