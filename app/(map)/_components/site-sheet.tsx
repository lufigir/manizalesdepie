"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { confirmSiteStatus } from "@/data/site/site.actions";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  ITEM_MODE_LABEL,
  SITE_STATUS_LABEL,
  SITE_STATUS_STYLE,
  SITE_TYPE_COLOR,
  SITE_TYPE_LABEL,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The detail sheet. Two things earn the top of the card, because the research
 * says they are what goes wrong: whether the place is open right now, and what
 * it refuses to receive. The Red Cross has publicly asked people to stop
 * bringing used clothing; that belongs above the fold, not in a footnote.
 */
export function SiteSheet({
  site,
  onClose,
}: {
  site: SiteDTO;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { label: freshLabel, stale } = freshness(site.confirmedAt);

  const needed = site.items
    .filter((item) => item.mode === "needed")
    .sort((a, b) => b.priority - a.priority);
  const refused = site.items.filter((item) => item.mode === "not_accepted");

  return (
    <section
      aria-label={site.name}
      className="bg-background absolute inset-x-0 bottom-0 z-20 max-h-[72dvh] overflow-y-auto rounded-t-2xl border-t shadow-2xl"
    >
      <div className="bg-muted mx-auto mt-2 h-1 w-10 shrink-0 rounded-full" />

      <div className="flex flex-col gap-4 p-4 pb-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "text-primary-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
                  SITE_TYPE_COLOR[site.type],
                )}
              >
                {SITE_TYPE_LABEL[site.type]}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold",
                  SITE_STATUS_STYLE[site.status],
                )}
              >
                {SITE_STATUS_LABEL[site.status]}
              </span>
              {site.verified && (
                <span className="text-verified border-verified/30 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold">
                  Verificado
                </span>
              )}
            </div>
            <h2 className="text-lg leading-tight font-bold text-balance">
              {site.name}
            </h2>
            <p className={cn("text-xs", stale ? "text-claimed" : "text-muted-foreground")}>
              {freshLabel}
              {site.neighborhood && ` · ${site.neighborhood}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="hover:bg-accent focus-visible:ring-ring rounded-full p-1.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </header>

        {site.description && (
          <p className="text-muted-foreground text-sm">{site.description}</p>
        )}

        {needed.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-muted-foreground text-[0.7rem] font-semibold tracking-wider uppercase">
              {ITEM_MODE_LABEL.needed}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {needed.map((item) => (
                <li
                  key={item.id}
                  className="bg-resolved-surface text-resolved border-resolved/25 rounded-md border px-2 py-1 text-xs font-medium"
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {refused.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-unclaimed text-[0.7rem] font-semibold tracking-wider uppercase">
              {ITEM_MODE_LABEL.not_accepted}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {refused.map((item) => (
                <li
                  key={item.id}
                  className="bg-unclaimed-surface text-unclaimed border-unclaimed/25 rounded-md border px-2 py-1 text-xs font-medium line-through"
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="text-sm">
          {site.address && (
            <div className="flex gap-2 py-1">
              <dt className="text-muted-foreground w-20 shrink-0">Dirección</dt>
              <dd>{site.address}</dd>
            </div>
          )}
          {site.schedule && (
            <div className="flex gap-2 py-1">
              <dt className="text-muted-foreground w-20 shrink-0">Horario</dt>
              <dd>{site.schedule}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold"
          >
            Cómo llegar
          </a>
          {site.whatsapp && (
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary text-secondary-foreground flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold"
            >
              WhatsApp
            </a>
          )}
        </div>

        {/* The mechanism that keeps this from becoming a list of places that
            closed on Tuesday. One tap from whoever is standing there. */}
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs">
            ¿Estás ahí ahora? Dinos cómo lo encontraste:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["open", "full", "closed"] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await confirmSiteStatus(site.id, status);
                  })
                }
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-50",
                  SITE_STATUS_STYLE[status],
                )}
              >
                {SITE_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
