"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  LIST_LABEL,
  SITE_STATUS_MARKER,
  SITE_STATUS_LABEL,
  SITE_STATUS_STYLE,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  confidence,
  freshness,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The same points as a list, synced both ways with the map.
 *
 * Taken from mapcn's store-locator: selecting in the list moves the map, and
 * selecting on the map scrolls the list. Two reasons it earns its place here
 * rather than being a second way to show the same thing — a pin is a small
 * touch target on a phone held one-handed, and a list can be scanned in an
 * order, which a scatter of dots cannot.
 *
 * The filter is a plain text match over what is already loaded. It is not
 * geocoding: nothing is sent anywhere, and it works with no signal.
 */
export function SiteList({
  sites,
  query,
  onQueryChange,
  selectedId,
  onSelect,
}: {
  sites: SiteDTO[];
  query: string;
  onQueryChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const items = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!selectedId) return;
    items.current
      .get(selectedId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <aside className="bg-background flex h-[38dvh] min-h-0 shrink-0 flex-col border-t md:h-auto md:w-80 md:border-t-0 md:border-l">
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={LIST_LABEL.searchPlaceholder}
            aria-label={LIST_LABEL.searchPlaceholder}
            className="pl-8"
          />
        </div>
        <p className="text-muted-foreground text-xs tabular-nums">
          {sites.length === 1
            ? LIST_LABEL.countOne
            : LIST_LABEL.countMany(sites.length)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sites.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {LIST_LABEL.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sites.map((site) => {
              const active = site.id === selectedId;
              const Icon = SITE_TYPE_ICON[site.type];
              const { label: freshLabel, stale } = freshness(site.confirmedAt);
              const { label: confidenceLabel } = confidence(site);

              return (
                <li key={site.id}>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) items.current.set(site.id, el);
                      else items.current.delete(site.id);
                    }}
                    onClick={() => onSelect(site.id)}
                    aria-current={active}
                    className={cn(
                      "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      active ? "bg-accent border-primary" : "border-transparent",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          SITE_STATUS_MARKER[site.status],
                        )}
                      >
                        <Icon
                          className="size-3.5"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                          {SITE_TYPE_LABEL[site.type]}
                        </p>
                        <p className="text-sm leading-tight font-semibold text-balance">
                          {site.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
                          SITE_STATUS_STYLE[site.status],
                        )}
                      >
                        {SITE_STATUS_LABEL[site.status]}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-1 text-[0.7rem]",
                        stale ? "text-claimed" : "text-muted-foreground",
                      )}
                    >
                      {freshLabel} · {confidenceLabel}
                      {site.neighborhood && ` · ${site.neighborhood}`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
