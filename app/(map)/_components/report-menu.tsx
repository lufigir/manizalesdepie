"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, X } from "lucide-react";

import { REPORT_MENU } from "@/lib/labels";
import type { ReportEntry } from "@/lib/tabs";
import { cn } from "@/lib/utils";

/**
 * The write path — the whole of it.
 *
 * It stood beside a per-chip primary action until the filter stopped deciding
 * what anyone is allowed to report (see `ALL_REPORT_ENTRIES`). Now it is the
 * only button in that corner and it carries every form in the app, unchanged
 * from chip to chip, so "¿cómo reporto esto?" has exactly one answer wherever
 * the reader happens to be.
 *
 * The open menu is one card of rows, matching `AttendanceStats` in the
 * opposite corner: same radius, same border, same translucent background,
 * same shadow. It was four free-floating pills before, each with its own
 * border weight, border style and hover colour — solid red, solid green,
 * dashed red, dashed grey — which was a legend nobody asked for, on a
 * control where the colour encodes nothing a reader has to decide. The hue
 * survives where it costs nothing and still helps: the icon.
 */
export function ReportMenu({
  entries,
  barrio,
}: {
  entries: ReportEntry[];
  /** Travels into the query string, same as the primary link — the form
   *  opens already framed on the barrio being looked at. */
  barrio: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {open && (
        <div className="bg-background/95 flex w-max min-w-56 flex-col rounded-xl border p-1.5 shadow-lg backdrop-blur">
          <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-[0.55rem] leading-none font-semibold tracking-widest uppercase">
            {REPORT_MENU.heading}
          </p>
          {entries.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={barrio ? `${href}?barrio=${encodeURIComponent(barrio)}` : href}
              className="hover:bg-accent focus-visible:ring-ring flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon
                className={cn("size-4.5 shrink-0", tone)}
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRight
                className="text-muted-foreground/60 size-4 shrink-0"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      )}

      {/* Rounded to match the card above it and the one across the map,
          rather than the pill it was: three floating controls with three
          different silhouettes read as three unrelated apps. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? REPORT_MENU.closeLabel : REPORT_MENU.openLabel}
        className={cn(
          "focus-visible:ring-ring flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold shadow-lg transition-colors focus-visible:ring-2 focus-visible:outline-none",
          open
            ? "bg-background/95 text-foreground border backdrop-blur"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {open ? (
          <X className="size-5" strokeWidth={2.5} aria-hidden />
        ) : (
          <Plus className="size-5" strokeWidth={2.5} aria-hidden />
        )}
        {open ? REPORT_MENU.close : REPORT_MENU.open}
      </button>
    </div>
  );
}
