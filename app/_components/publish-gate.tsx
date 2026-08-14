"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AUTH_LABEL } from "@/lib/labels";

/**
 * The submit button for anything that needs an account to publish.
 *
 * Deferred sign-up: the whole form is open to everyone, and the account is
 * asked for at the last step — once there is something worth keeping. Asking at
 * the door turns away the person who was going to fill it in.
 *
 * The line is narrow on purpose. Reporting a fact — an acopio, a shelter, an
 * animal, a family's need — stays anonymous. An account is only required where
 * other people end up depending on you: creating a shift someone signs up for,
 * which also makes you the custodian of their phone numbers. If others depend
 * on you, you show your face.
 */
export function PublishGate({
  signedIn,
  onBeforeRedirect,
  pending,
  children,
}: {
  signedIn: boolean;
  /** Flush the draft before the browser leaves for Google. */
  onBeforeRedirect: () => void;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (signedIn) {
    return (
      <Button type="submit" size="lg" loading={pending}>
        {children}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        onClick={() => {
          // Flush the draft first. /auth/login is an ordinary internal page —
          // the jump off-origin happens from there, once Google is called — so
          // this is a client transition and stays one.
          onBeforeRedirect();
          router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        }}
      >
        {AUTH_LABEL.google}
      </Button>
      <p className="text-muted-foreground text-xs">
        {AUTH_LABEL.gateReason}
      </p>
    </div>
  );
}
