"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AUTH_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

/**
 * Starts the PKCE redirect to Google.
 *
 * `redirectTo` is built from `window.location.origin`, not from
 * NEXT_PUBLIC_SITE_URL: the same build runs on localhost, on a per-commit
 * preview URL and in production, and hardcoding the production origin would
 * bounce every developer and every preview through the live site. The origins
 * still have to be allow-listed in Supabase — that list is the actual guard.
 */
export function GoogleButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setLoading(true);
    setFailed(false);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // On success the browser is already navigating to Google, so the spinner
    // deliberately stays up until the page is replaced.
    if (error) {
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" loading={loading} onClick={signIn}>
        {AUTH_LABEL.google}
      </Button>
      {failed && (
        <p role="alert" className="text-unclaimed text-sm">
          {AUTH_LABEL.failed}
        </p>
      )}
    </div>
  );
}
