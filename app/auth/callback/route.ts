import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { createServerSupabase } from "@/lib/supabase/server";

import { safeNext } from "../safe-next";

/**
 * Where Google sends the browser back. Trades the one-time auth code for a
 * session and writes the cookies.
 *
 * `sb_flow_id` is read and forwarded because @supabase/auth-js supports several
 * PKCE flows in flight at once: without it the exchange falls back to the most
 * recently stored verifier, and a mismatched verifier burns the single-use code
 * instead of failing cleanly. Two tabs open on a bad signal is enough to hit it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    log.warn("auth.callback reached without a code");
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    // The message is safe to log; the code and the cookies are not, and the
    // logger redacts anything that looks like either.
    log.error("auth.callback exchange failed", { reason: error.message });
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  // The map's shell renders differently once there is a session — the account
  // bubble above all — so the cached copy has to go with it. `signOut` already
  // did this on the way out; signing in was the half that was missing, which
  // is what left "Entrar" on screen after a successful return from Google.
  revalidatePath("/", "layout");

  log.info("auth.callback signed in");
  return NextResponse.redirect(`${origin}${next}`);
}
