"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AUTH_LABEL } from "@/lib/labels";
import { startGoogleSignIn } from "@/lib/supabase/client";

/**
 * Starts the Google sign-in — one tap, straight to the provider, no page in
 * between. `next` travels into the callback query string so the reader lands
 * back where they were heading.
 */
export function GoogleButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setLoading(true);
    setFailed(false);

    const started = await startGoogleSignIn(next);

    // On success the browser is already navigating to Google, so the spinner
    // deliberately stays up until the page is replaced.
    if (!started) {
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
        <p role="alert" className="text-pending text-sm">
          {AUTH_LABEL.failed}
        </p>
      )}
    </div>
  );
}
