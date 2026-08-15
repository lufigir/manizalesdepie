"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SHEET_LABEL } from "@/lib/labels";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

/**
 * "Ver más" — everything true about a pin that does not fit in the summary.
 *
 * It opens in two different places on purpose, and the reason is the same one
 * that decides where the card itself opens (see `MapCard`).
 *
 * Beside the map, on a wide screen, a lateral sheet is the right home: the pin
 * and its surroundings stay in view while the detail reads next to them.
 * Inside a bottom drawer on a phone, that same sheet is a second layer stacked
 * over the first — two things to close before the map comes back — so there
 * the detail simply unfolds in the drawer that is already open and already
 * scrolls.
 */
export function MoreDetails({
  title,
  subtitle,
  meta,
  children,
}: {
  /** The sheet's own heading on a wide screen. Unused on a phone, where the
   *  card the detail unfolds inside already carries the name. */
  title: string;
  subtitle?: string;
  /** The card's quiet line — freshness, barrio, a headcount. It rides on the
   *  same row as the trigger rather than above it: both are small, both are
   *  secondary, and between them they were spending two rows of a card whose
   *  actual job starts at the buttons underneath. */
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [open, setOpen] = useState(false);

  const triggerClass =
    "text-primary focus-visible:ring-ring inline-flex shrink-0 items-center gap-0.5 text-[0.7rem] font-semibold focus-visible:ring-2 focus-visible:outline-none";

  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {meta}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={cn(triggerClass, "ms-auto")}
          >
            {open ? SHEET_LABEL.lessInfo : SHEET_LABEL.moreInfo}
            {open ? (
              <ChevronUp className="size-3" aria-hidden />
            ) : (
              <ChevronDown className="size-3" aria-hidden />
            )}
          </button>
        </div>

        {open && (
          <div className="flex flex-col gap-2.5 border-t pt-2 text-[0.8rem]">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      {meta}
      <Sheet>
        <SheetTrigger
          render={<button type="button" className={cn(triggerClass, "ms-auto")} />}
        >
          {SHEET_LABEL.moreInfo}
          <ChevronRight className="size-3" aria-hidden />
        </SheetTrigger>

        <SheetPopup side="right">
          <SheetHeader>
            <SheetTitle className="text-base">{title}</SheetTitle>
            {subtitle && (
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            )}
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-4 text-sm">
            {children}
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </div>
  );
}
