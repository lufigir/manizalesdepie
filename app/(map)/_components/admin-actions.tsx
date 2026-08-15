"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADMIN_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The curator-only strip on a card — hide/publish, delete. Rendered
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
  onDelete,
}: {
  published: boolean;
  onSetPublished: (published: boolean) => Promise<void>;
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

      <Button
        size="sm"
        variant="outline"
        loading={pending}
        onClick={() => startTransition(() => onSetPublished(!published))}
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
      </Button>

      <div className="ml-auto flex items-center gap-1">
        {confirmingDelete ? (
          <>
            <span className="text-unclaimed text-[0.65rem] font-semibold">
              {ADMIN_LABEL.deleteConfirm}
            </span>
            <Button
              size="sm"
              variant="destructive"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await onDelete();
                  setConfirmingDelete(false);
                })
              }
            >
              {ADMIN_LABEL.deleteConfirmShort}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              {ADMIN_LABEL.cancel}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="destructive-outline"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-3" aria-hidden />
            {ADMIN_LABEL.delete}
          </Button>
        )}
      </div>
    </div>
  );
}
