"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import type { ReportEntry } from "@/lib/tabs";
import { cn } from "@/lib/utils";

/**
 * The secondary write path: whatever a chip can report beyond its one
 * primary action. Renders nothing when a chip's entries are empty —
 * "Mascotas" and "Servicios" have exactly one thing to report, and their
 * primary button already is it.
 *
 * Sized and shaped like a real button now, not a quiet icon-only circle:
 * on "Todo" and "Sitios" — the two chips with no primary action of their
 * own — this is the ONLY way in to reporting anything, so it has to read as
 * an invitation on its own, not as an afterthought beside a bigger button
 * that, on those two chips, is not even there.
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
        <div className="flex flex-col items-start gap-1.5">
          {entries.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={barrio ? `${href}?barrio=${encodeURIComponent(barrio)}` : href}
              className="bg-background/95 focus-visible:ring-ring flex items-center gap-1.5 rounded-full border py-2 pr-3.5 pl-3 text-xs font-semibold shadow-lg backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Cerrar opciones de reportar" : "Más formas de reportar"}
        className={cn(
          "focus-visible:ring-ring flex items-center gap-2 rounded-full py-3 pr-4 pl-3.5 text-sm font-semibold shadow-lg transition-colors focus-visible:ring-2 focus-visible:outline-none",
          open
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {open ? (
          <X className="size-4" strokeWidth={2.5} aria-hidden />
        ) : (
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        )}
        {open ? "Cerrar" : "Reportar"}
      </button>
    </div>
  );
}
