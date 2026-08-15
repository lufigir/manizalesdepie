"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

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
          {entries.map(({ href, label, icon: Icon }) => {
            const path = href.split("?")[0];
            let borderStyle = "border-border hover:bg-accent text-foreground rounded-full border";
            let iconStyle = "text-muted-foreground";

            switch (path) {
              case "/reportar/necesidad":
                // Necesidades: Solid border-unclaimed (red)
                borderStyle = "border-unclaimed/70 text-unclaimed bg-background/95 hover:bg-unclaimed-surface/50 rounded-full border-2";
                iconStyle = "text-unclaimed";
                break;
              case "/reportar/armar-grupo":
                // Grupos: Square-ish rounded corner (rounded-md/lg), border-group (purple)
                borderStyle = "border-group/70 text-group bg-background/95 hover:bg-group-surface/50 rounded-lg border-2";
                iconStyle = "text-group";
                break;
              case "/reportar/sitio":
                // Sitios: Solid border-resolved (green)
                borderStyle = "border-resolved/70 text-resolved bg-background/95 hover:bg-resolved-surface/50 rounded-full border-2";
                iconStyle = "text-resolved";
                break;
              case "/reportar/animal":
                // Mascotas: Dashed red border (sighting trace)
                borderStyle = "border-dashed border-2 border-unclaimed/60 text-unclaimed bg-background/95 hover:bg-unclaimed-surface/50 rounded-full";
                iconStyle = "text-unclaimed";
                break;
              case "/reportar/servicios":
                // Servicios: Dashed gray border
                borderStyle = "border-dashed border-2 border-muted-foreground/60 text-muted-foreground bg-background/95 hover:bg-accent rounded-full";
                iconStyle = "text-muted-foreground";
                break;
            }

            return (
              <Link
                key={href}
                href={barrio ? `${href}?barrio=${encodeURIComponent(barrio)}` : href}
                className={cn(
                  "focus-visible:ring-ring flex items-center gap-1.5 py-2 pr-3.5 pl-3 text-xs font-semibold shadow-lg backdrop-blur focus-visible:ring-2 focus-visible:outline-none",
                  borderStyle
                )}
              >
                <Icon className={cn("size-3.5", iconStyle)} strokeWidth={2.5} aria-hidden />
                {label}
              </Link>
            );
          })}
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

