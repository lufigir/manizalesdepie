"use client";

import { useState, useTransition } from "react";
import { Check, Navigation, Share2 } from "lucide-react";

import { confirmSiteStatus } from "@/data/site/site.actions";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  CONFIDENCE_BADGE,
  ITEM_MODE_LABEL,
  SHEET_LABEL,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_STATUS_STYLE,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  confidence,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The card that opens on the pin itself.
 *
 * It replaced a bottom sheet, and the reason is spatial: a sheet slides up from
 * the edge and covers the map, so the reader loses the one thing they came for
 * — where this is, relative to everything else. Anchored to the marker, the
 * answer and its place on the map stay on screen together.
 *
 * Order inside the card is not cosmetic. What a place REFUSES sits above what
 * it needs, because that is what actually goes wrong: the Red Cross has asked
 * publicly that people stop bringing used clothing, and someone reading in a
 * hurry must hit that before they load the car.
 */
export function SitePopup({ site }: { site: SiteDTO }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const { label: freshLabel, stale } = freshness(site.confirmedAt);
  const { level, label: confidenceLabel } = confidence(site);
  const Icon = SITE_TYPE_ICON[site.type];

  const needed = site.items
    .filter((item) => item.mode === "needed")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
  const refused = site.items.filter((item) => item.mode === "not_accepted");

  async function share() {
    const url = `${window.location.origin}/punto/${site.id}`;

    // The native sheet puts WhatsApp first on Android — one tap back into the
    // group the question came from.
    if (navigator.share) {
      try {
        await navigator.share({ title: site.name, text: site.name, url });
      } catch {
        // Dismissed. Not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <header className="flex items-start gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            SITE_STATUS_MARKER[site.status],
          )}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
            {SITE_TYPE_LABEL[site.type]}
          </p>
          <h2 className="text-sm leading-tight font-bold text-balance">
            {site.name}
          </h2>
        </div>
      </header>

      <div className="flex flex-wrap gap-1">
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            SITE_STATUS_STYLE[site.status],
          )}
        >
          {SITE_STATUS_LABEL[site.status]}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            CONFIDENCE_BADGE[level],
          )}
        >
          {confidenceLabel}
        </span>
      </div>

      <p
        className={cn(
          "text-[0.7rem]",
          stale ? "text-claimed" : "text-muted-foreground",
        )}
      >
        {freshLabel}
        {site.neighborhood && ` · ${site.neighborhood}`}
        {site.schedule && ` · ${site.schedule}`}
      </p>

      {refused.length > 0 && (
        <div className="border-unclaimed/25 bg-unclaimed-surface rounded-md border px-2 py-1.5">
          <p className="text-unclaimed text-[0.65rem] font-bold tracking-wide uppercase">
            {ITEM_MODE_LABEL.not_accepted}
          </p>
          <p className="text-unclaimed text-[0.7rem] leading-snug font-medium">
            {refused.map((item) => item.label).join(" · ")}
          </p>
        </div>
      )}

      {needed.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-[0.65rem] font-bold tracking-wide uppercase">
            {ITEM_MODE_LABEL.needed}
          </p>
          <ul className="flex flex-wrap gap-1">
            {needed.map((item) => (
              <li
                key={item.id}
                className="bg-resolved-surface text-resolved border-resolved/25 rounded px-1.5 py-0.5 text-[0.7rem] font-medium"
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-1.5">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${site.latitude},${site.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold"
        >
          <Navigation className="size-3.5" aria-hidden />
          {SHEET_LABEL.directions}
        </a>
        {site.whatsapp && (
          <a
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-2 text-xs font-semibold"
          >
            {SHEET_LABEL.whatsapp}
          </a>
        )}
        <button
          type="button"
          onClick={share}
          aria-label={SHEET_LABEL.share}
          className="bg-secondary text-secondary-foreground flex items-center justify-center rounded-md px-2 py-2"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Share2 className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      {/* The mechanism that keeps this from becoming a list of places that
          closed on Tuesday. One tap, no account. */}
      <div className="border-t pt-2">
        <p className="text-muted-foreground mb-1.5 text-[0.65rem]">
          {SHEET_LABEL.confirmPrompt}
        </p>
        <div className="grid grid-cols-3 gap-1">
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
                "rounded border px-1 py-1.5 text-[0.7rem] font-semibold disabled:opacity-50",
                SITE_STATUS_STYLE[status],
              )}
            >
              {SITE_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
