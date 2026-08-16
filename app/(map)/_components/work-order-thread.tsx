"use client";

import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  WorkOrderUpdateDTO,
  WorkOrderUpdateKind,
} from "@/data/work_order/work_order.dto";
import {
  WORK_ORDER_LABEL,
  WORK_ORDER_UPDATE_KIND_STYLE,
  WORK_ORDER_UPDATE_KIND_TAG,
  timeAgo,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

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
 * So it is written as a feed and not as a list of records: an entry has an
 * author, a moment, and a sentence addressed to the next person, which is a
 * post. The vertical rule down the left is what makes several of them read as
 * one continuing story rather than four unrelated rows — the case is the
 * thread, and the pin is just where it happens.
 *
 * Newest last, oldest first, like every chat anybody here already uses.
 * Reverse-chronological is the convention for feeds you dip into; a case is
 * read to find out how it got to where it is, which means from the beginning.
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
  const name = update.name ?? WORK_ORDER_LABEL.anonymous;

  return (
    <li className="relative flex gap-2 pb-2.5 last:pb-0">
      {/* The rule joining one entry to the next, drawn behind the dot rather
          than as a border on the row: a border would also draw under the
          first entry's top half and past the last one's bottom, which reads
          as a thread that continues above and below what is actually there. */}
      <span
        className={cn(
          "bg-border absolute left-[0.3125rem] w-px",
          first ? "top-2.5" : "top-0",
          last ? "h-0" : "bottom-0",
        )}
        aria-hidden
      />

      {/* Colour-coded to the kind, so the shape of what happened here is
          readable down the gutter before a single word is: a column of green
          is a case people keep helping with, a red dot low down is somebody
          saying it is still not enough. Same tokens the badge uses. */}
      <span
        className={cn(
          "relative mt-1.5 size-2.5 shrink-0 rounded-full border",
          KIND_DOT[update.kind],
        )}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[0.7rem] leading-tight font-semibold">
            {name}
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

        <span
          className={cn(
            "mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
            WORK_ORDER_UPDATE_KIND_STYLE[update.kind],
          )}
        >
          {WORK_ORDER_UPDATE_KIND_TAG[update.kind]}
        </span>

        {/* The note is the entry. Everything above it is metadata about who
            said it and when; this is the sentence that is worth reading, so
            it gets reading weight and the full width. `whitespace-pre-line`
            keeps the line breaks somebody typed — these are often a short
            list of what is left to do. */}
        {update.note && (
          <p className="mt-1 text-[0.75rem] leading-snug whitespace-pre-line">
            {update.note}
          </p>
        )}

        {update.phone && (
          <Button
            size="sm"
            variant="outline"
            className="mt-1.5"
            render={<a href={`tel:${update.phone}`} />}
          >
            <Phone className="size-3.5" aria-hidden />
            {update.phone}
          </Button>
        )}
      </div>
    </li>
  );
}

/** The gutter dot, one per kind. Solid fills rather than the badge's tinted
 *  surfaces: at 10px a surface colour is indistinguishable from the page. */
const KIND_DOT: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "bg-claimed border-claimed",
  helped: "bg-resolved border-resolved",
  still_needed: "bg-unclaimed border-unclaimed",
  not_real: "bg-stale border-stale",
};
