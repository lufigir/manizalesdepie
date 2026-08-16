"use client";

import { useState, useTransition } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import type { CurrentUser } from "@/data/user/require-user";
import { AUTH_LABEL } from "@/lib/labels";
import { startGoogleSignIn } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The account bubble, top-left of the map.
 *
 * Signed out it is one word — "Entrar" — and nothing else, because the map
 * never asks for an account (see `AUTH_LABEL`): the bubble is a door, not a
 * nag. One tap goes straight to Google — there is no `/auth/login` page in
 * the way — and the reader lands back where they were heading, because the
 * current path rides along as `next`. Signed in it becomes a roundel with
 * the reader's initial, opening a small menu with who they are, what their
 * role lets them do, and the way out.
 *
 * The role is named, not hidden: it is what decides whether the edit/hide/
 * delete strips appear on the cards, so somebody holding it should be able to
 * say why the map changed under them.
 */
export function AccountMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [signingIn, setSigningIn] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setSigningIn(true);
    setFailed(false);

    // The path, not the origin: `startGoogleSignIn` builds the callback URL
    // from `window.location.origin` itself, and only a same-site path is
    // safe to hand to it (see `safeNext`).
    const started = await startGoogleSignIn(window.location.pathname);

    // On success the browser is already navigating to Google, so the spinner
    // stays up until the page is replaced.
    if (!started) {
      setFailed(true);
      setSigningIn(false);
    }
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        disabled={signingIn}
        className="bg-background/90 focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.7rem] font-semibold shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
      >
        <LogIn className="size-3.5" strokeWidth={2.5} aria-hidden />
        {AUTH_LABEL.enter}
        {failed && (
          <span className="sr-only" role="alert">
            {AUTH_LABEL.failed}
          </span>
        )}
      </button>
    );
  }

  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={AUTH_LABEL.menuLabel}
        className="bg-background/90 focus-visible:ring-ring flex items-center gap-1.5 rounded-full border py-1.5 pr-2.5 pl-1.5 text-[0.7rem] font-semibold shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
      >
        {user.avatarUrl ? (
          // The provider's photo when Google sent one; the initial is only
          // the fallback for a sign-in that carried no picture.
          <span className="relative size-6 shrink-0 overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
          </span>
        ) : (
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold">
            {initial}
          </span>
        )}
        <span className="max-w-24 truncate">{user.fullName}</span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <>
          {/* A tap anywhere else closes the menu. A full-screen transparent
              layer rather than a blur listener: it also eats the click, so
              the map does not pan or deselect underneath. */}
          <button
            type="button"
            aria-label={AUTH_LABEL.menuLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="bg-popover shadow-lg absolute top-full left-0 z-20 mt-1.5 min-w-44 rounded-md border p-1"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="text-muted-foreground text-xs">
                {AUTH_LABEL.roles[user.role]}
              </p>
              {user.email && (
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {user.email}
                </p>
              )}
            </div>
            <div className="bg-border my-1 h-px" />
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(() => void signOut())}
              className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <LogOut className="size-3.5" aria-hidden />
              {AUTH_LABEL.signOut}
            </button>
          </div>
        </>
      )}
    </div>
  );
}