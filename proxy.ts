import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clientEnv } from "@/lib/env";

/**
 * Renamed from `middleware` in Next 16: the file is `proxy.ts`, the export is
 * `proxy`, and the runtime is Node and cannot be configured. Supabase's own
 * documentation still says `middleware.ts`; the pattern is right, the filename
 * is stale.
 *
 * This does one job: refresh the session cookie. It performs the cheap,
 * optimistic check and nothing else — no database round trip, because it runs
 * on every matched request and would tax the whole app.
 *
 * It is NOT the security model. Authorization lives next to the data, in the
 * DAL, where it cannot be forgotten. Forget a matcher entry here and a route is
 * open; forget nothing there and no route is.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Must run before the response is committed. If the refresh finishes after
  // that, the new cookies are lost and every request refreshes again.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
