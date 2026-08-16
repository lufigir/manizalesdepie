"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteWorkOrderUpdate } from "@/data/work_order/work_order.actions";
import type {
  WorkOrderUpdateDTO,
  WorkOrderUpdateKind,
} from "@/data/work_order/work_order.dto";
import {
  ADMIN_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_UPDATE_KIND_TAG,
  timeAgo,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";
import { WhatsappIcon } from "./whatsapp-icon";

/**
 * The book of a case, as a feed.
 *
 * This is the product. A necesidad persists — "en esta esquina se necesita
 * remoción de escombros" stays true until somebody removes the escombros —
 * and the thing that makes it worth having on a map rather than in a WhatsApp
 * message is that several people can work on it across several days and each
 * one leaves behind what they found. Somebody clears the patio on Tuesday and
 * writes that the second floor is still full; the person reading on Saturday
 * knows what to bring. A chat cannot do that. This can.
 *
 * Newest last, oldest first, like every chat anybody here already uses.
 * Reverse-chronological is the convention for feeds you dip into; a case is
 * read to find out how it got to where it is, which means from the beginning.
 *
 * Laid out to spend the panel's width rather than stack four short lines down
 * its left edge. The first version gave the author, the kind badge, the time
 * and the note a row each, which on a 26rem sheet meant an entry three words
 * long was 90px tall and a thread of five did not fit on a phone. Now the kind
 * rides the gutter as a coloured dot, the author and the time share one line,
 * and the note starts immediately underneath at reading weight.
 */
export function WorkOrderThread({
  updates,
  /** The entry this reader just posted, marked so their own note is findable
   *  in a thread that may be long. Cleared by the parent on close. */
  highlightId,
}: {
  updates: WorkOrderUpdateDTO[] | null;
  highlightId?: string | null;
}) {
  if (updates === null) {
    return (
      <p className="text-muted-foreground py-2 text-[0.7rem]">
        {WORK_ORDER_LABEL.attendeesLoading}
      </p>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="py-1">
        <p className="text-muted-foreground text-[0.7rem]">
          {WORK_ORDER_LABEL.attendeesEmpty}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[0.65rem] leading-snug">
          {WORK_ORDER_LABEL.threadEmptyHint}
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {updates.map((update, index) => (
        <Entry
          key={update.id}
          update={update}
          first={index === 0}
          last={index === updates.length - 1}
          mine={update.id === highlightId}
        />
      ))}
    </ol>
  );
}

function Entry({
  update,
  first,
  last,
  mine,
}: {
  update: WorkOrderUpdateDTO;
  first: boolean;
  last: boolean;
  mine: boolean;
}) {
  const { isAdmin } = useWorkspace();
  const [pending, startTransition] = useTransition();

  const name = update.name ?? WORK_ORDER_LABEL.anonymous;

  return (
    <li className="group relative flex gap-2 pb-3 last:pb-0">
      {/* The rule joining one entry to the next, drawn behind the dot rather
          than as a border on the row: a border would also draw under the
          first entry's top half and past the last one's bottom, which reads
          as a thread that continues above and below what is actually there. */}
      <span
        className={cn(
          "bg-border absolute left-[0.3125rem] w-px",
          first ? "top-2" : "top-0",
          last ? "h-0" : "bottom-0",
        )}
        aria-hidden
      />

      {/* Colour-coded to the kind, so the shape of what happened here is
          readable down the gutter before a single word is: a column of green
          is a case people keep helping with, a red dot low down is somebody
          saying it is still not enough.

          This IS the kind label now. It used to be a pill on its own line
          under the name — a whole row, and a second copy of what the colour
          already said. The word survives as the dot's tooltip and in the
          screen-reader text below. */}
      <span
        className={cn(
          "relative mt-1 size-2.5 shrink-0 rounded-full ring-2",
          "ring-background",
          KIND_DOT[update.kind],
        )}
        title={WORK_ORDER_UPDATE_KIND_TAG[update.kind]}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        {/* Author, kind and time on one line. The kind is plain coloured text
            rather than a bordered pill: at this size a pill costs 8px of
            padding and a border to say a word that is already colour-coded
            two millimetres to its left. */}
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[0.7rem] leading-tight font-semibold">
            {name}
          </span>
          <span
            className={cn(
              "shrink-0 text-[0.65rem] leading-tight font-medium",
              KIND_TEXT[update.kind],
            )}
          >
            {WORK_ORDER_UPDATE_KIND_TAG[update.kind]}
          </span>
          {mine && (
            <span className="text-primary shrink-0 text-[0.6rem] font-semibold">
              {WORK_ORDER_LABEL.threadYours}
            </span>
          )}
          {/* Never truncated and never wrapped: it is four characters and it
              is what orders the whole thread. */}
          <span className="text-muted-foreground ml-auto shrink-0 text-[0.6rem] whitespace-nowrap tabular-nums">
            {timeAgo(update.createdAt)}
          </span>
        </div>

        {/* The note is the entry. Everything above it is metadata about who
            said it and when; this is the sentence that is worth reading, so
            it gets reading weight and the full width. `whitespace-pre-line`
            keeps the line breaks somebody typed — these are often a short
            list of what is left to do. */}
        {update.note && (
          <p className="mt-0.5 text-[0.75rem] leading-snug whitespace-pre-line">
            {update.note}
          </p>
        )}

        {/* WhatsApp and the curator's delete share the footer row, so neither
            costs a line of its own. The number goes to WhatsApp rather than
            the dialler, because that is where the coordination of a case
            actually happens — the same decision the card's contact block
            makes. */}
        {(update.phone || isAdmin) && (
          <div className="mt-1 flex items-center gap-1">
            {update.phone && (
              <Button
                size="xs"
                variant="outline"
                render={
                  <a
                    href={`https://wa.me/57${update.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <WhatsappIcon />
                {update.phone}
              </Button>
            )}

            {/* Curator only — see `canDeleteWorkOrderUpdate`. The book is
                append-only for everyone else on purpose: two "ya ayudé" close
                a case, so a delete is a state change in disguise. This exists
                for the one thing an append-only log cannot handle — abuse, or
                a phone number that should never have been published.

                Ghost weight and pushed to the far edge, like every other
                control here that a mistap would hurt. */}
            {isAdmin && (
              <Button
                size="icon-xs"
                variant="ghost"
                loading={pending}
                aria-label={ADMIN_LABEL.delete}
                title={ADMIN_LABEL.delete}
                className="text-muted-foreground hover:text-destructive-foreground ml-auto"
                onClick={() =>
                  startTransition(async () => {
                    await deleteWorkOrderUpdate(update.id);
                  })
                }
              >
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** The gutter dot, one per kind. Solid fills rather than the badge's tinted
 *  surfaces: at 10px a surface colour is indistinguishable from the page. */
const KIND_DOT: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "bg-claimed",
  helped: "bg-resolved",
  still_needed: "bg-unclaimed",
  not_real: "bg-stale",
};

/** The same four states as words, for the line beside the name. */
const KIND_TEXT: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "text-claimed",
  helped: "text-resolved",
  still_needed: "text-unclaimed",
  not_real: "text-stale",
};
