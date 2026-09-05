"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Eye, RotateCcw, ShieldCheck } from "lucide-react";

import type { CurrentUser } from "@/data/user/current-user";
import { setDemoRole } from "@/data/user/user.actions";
import { AUTH_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useDemo } from "./demo-store";

/**
 * The bubble top-left of the map: which hat the reader is wearing, and the
 * way to swap it.
 *
 * It used to be an account. One tap went to Google, came back with a session,
 * and a `profiles` row decided whether the curator strips appeared on the
 * cards. The demo has no accounts — see `data/user/current-user.ts` — but it
 * kept the thing the account was actually for, because the alternative is a
 * visitor who never finds out that half of this product exists: the
 * moderation queue, the hidden rows, closing a case, deleting spam.
 *
 * So the hat is offered out loud rather than hidden behind a query string,
 * and the menu says what each one lets you see. The bubble also carries the
 * reset, which belongs beside it: both are "put the demo back how you found
 * it" controls, and the reset is the only way back from a map somebody has
 * been reporting into for ten minutes.
 *
 * Shares its silhouette with the other two things floating over the map —
 * `ReportMenu` bottom-left, `AttendanceStats` top-right — deliberately: same
 * radius, same border, same translucent background, same shadow.
 */
export function AccountMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { reset, touched } = useDemo();

  const curator = user?.role === "curator";

  function swap() {
    setOpen(false);
    startTransition(async () => {
      await setDemoRole(curator ? "visitor" : "curator");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={AUTH_LABEL.menuLabel}
        disabled={pending}
        className={cn(
          "focus-visible:ring-ring flex items-center gap-1.5 rounded-xl border py-1.5 pr-2.5 pl-1.5 text-xs font-semibold shadow-lg backdrop-blur transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70",
          // The hat is the one state worth spotting from across the screen:
          // every card renders differently under it.
          curator
            ? "bg-primary/10 border-primary/40"
            : "bg-background/95",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            curator
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {curator ? (
            <ShieldCheck className="size-3.5" aria-hidden />
          ) : (
            <Eye className="size-3.5" aria-hidden />
          )}
        </span>
        <span className="max-w-28 truncate">
          {curator ? AUTH_LABEL.roles.curator : AUTH_LABEL.roles.visitor}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3 transition-transform",
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
            className="bg-background/95 absolute top-full left-0 z-20 mt-1.5 w-64 rounded-xl border p-1.5 shadow-lg backdrop-blur"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">
                {curator ? AUTH_LABEL.curatorTitle : AUTH_LABEL.roles.visitor}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                {curator ? AUTH_LABEL.curatorHint : AUTH_LABEL.visitorHint}
              </p>
            </div>

            <div className="bg-border my-1 h-px" />

            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={swap}
              className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {curator ? (
                <Eye className="size-3.5" aria-hidden />
              ) : (
                <ShieldCheck className="size-3.5" aria-hidden />
              )}
              {curator ? AUTH_LABEL.leave : AUTH_LABEL.enter}
            </button>

            {/* Disabled until there is something to undo, so it reads as a
                consequence of what the reader did rather than as a button
                that might wipe the map they are looking at. */}
            <button
              type="button"
              role="menuitem"
              disabled={!touched}
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="hover:bg-accent focus-visible:ring-ring flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
            >
              <RotateCcw className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {AUTH_LABEL.reset}
                <span className="text-muted-foreground block text-xs font-normal">
                  {AUTH_LABEL.resetHint}
                </span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
