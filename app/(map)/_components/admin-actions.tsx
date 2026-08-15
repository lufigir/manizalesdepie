"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Eye, EyeOff, Trash2 } from "lucide-react";

import { ADMIN_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The curator-only strip on a card — hide/publish, verify, delete. Rendered
 * by each entity's own popup/card only when `useWorkspace().isAdmin` is
 * true; the entity's edit form lives beside this, not inside it, because
 * its fields differ per entity while these three actions never do.
 *
 * Delete asks twice, inline, rather than a native `confirm()`: a real
 * `DELETE FROM` is the one irreversible action here (see AGENTS.md's "nada
 * se borra por viejo" — this is the deliberate exception, for spam and test
 * rows, not for something that just went stale; that path is "Ocultar").
 */
export function AdminActions({
  published,
  onSetPublished,
  verified,
  onVerify,
  onDelete,
}: {
  published: boolean;
  onSetPublished: (published: boolean) => Promise<void>;
  /** Omitted entirely for entities with no verify step of their own. */
  verified?: boolean;
  onVerify?: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-dashed p-1.5",
        // A hidden row is the one state a curator has to be able to spot
        // while scrolling — it looks identical to a live one from the
        // public half of the card, since hiding changes nothing a visitor
        // would ever see. So the strip itself carries the colour: amber
        // means "this is off the public map", neutral means it is live.
        published ? "border-primary/30 bg-primary/5" : "border-claimed/40 bg-claimed-surface",
      )}
    >
      {/* State first, actions after: what this row IS matters more to
          someone auditing a list than what can be done to it. */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-1 text-[0.65rem] font-bold",
          published ? "text-muted-foreground" : "text-claimed",
        )}
      >
        {published ? (
          <>
            <Eye className="size-3" aria-hidden />
            {ADMIN_LABEL.visible}
          </>
        ) : (
          <>
            <EyeOff className="size-3" aria-hidden />
            {ADMIN_LABEL.hidden}
          </>
        )}
      </span>

      {verified && (
        <span className="border-verified/30 bg-verified/10 text-verified inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[0.65rem] font-semibold">
          <BadgeCheck className="size-3" aria-hidden />
          {ADMIN_LABEL.verified}
        </span>
      )}

      {onVerify && !verified && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(onVerify)}
          className="border-verified/30 bg-verified/10 text-verified inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[0.65rem] font-semibold disabled:opacity-50"
        >
          <BadgeCheck className="size-3" aria-hidden />
          {ADMIN_LABEL.verify}
        </button>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => onSetPublished(!published))}
        className="bg-background inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[0.65rem] font-semibold disabled:opacity-50"
      >
        {published ? (
          <>
            <EyeOff className="size-3" aria-hidden />
            {ADMIN_LABEL.hide}
          </>
        ) : (
          <>
            <Eye className="size-3" aria-hidden />
            {ADMIN_LABEL.publish}
          </>
        )}
      </button>

      <div className="ml-auto flex items-center gap-1">
        {confirmingDelete ? (
          <>
            <span className="text-unclaimed text-[0.65rem] font-semibold">
              {ADMIN_LABEL.deleteConfirm}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await onDelete();
                  setConfirmingDelete(false);
                })
              }
              className="bg-unclaimed text-unclaimed-foreground rounded px-1.5 py-1 text-[0.65rem] font-semibold disabled:opacity-50"
            >
              {ADMIN_LABEL.deleteConfirmShort}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-muted-foreground rounded px-1.5 py-1 text-[0.65rem] underline"
            >
              {ADMIN_LABEL.cancel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={cn(
              "text-unclaimed inline-flex items-center gap-1 rounded px-1.5 py-1 text-[0.65rem] font-semibold",
            )}
          >
            <Trash2 className="size-3" aria-hidden />
            {ADMIN_LABEL.delete}
          </button>
        )}
      </div>
    </div>
  );
}
