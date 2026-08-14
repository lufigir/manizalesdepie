"use client";

import Link from "next/link";

import { TABS, type TabId } from "@/lib/tabs";
import { cn } from "@/lib/utils";

/**
 * The four sections, as links rather than buttons.
 *
 * Links because each section is a real URL: someone finds a lost dog and pastes
 * `/mascotas` into the neighbourhood group, and that has to open on the board
 * instead of on whatever the app decided was the default. It also means the
 * back gesture undoes a section change, which on a phone is the gesture people
 * actually use.
 *
 * `prefetch` is left on: the payload is the panel only — the map lives in the
 * layout above and does not travel — so it is cheap and it makes switching
 * feel like a tab and not like a page load.
 */
export function TabBar({
  active,
  counts,
}: {
  active: TabId;
  /** How much each section holds, so an empty one is visible before it is
   *  opened rather than after. */
  counts: Record<TabId, number>;
}) {
  return (
    <nav
      aria-label="Secciones"
      className="pointer-events-auto no-scrollbar flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur-md sm:w-max"
    >
      {TABS.map(({ id, href, label, hint, icon: Icon }) => {
        const current = id === active;
        const count = counts[id];

        return (
          <Link
            key={id}
            href={href}
            aria-current={current ? "page" : undefined}
            title={hint}
            className={cn(
              "focus-visible:ring-ring flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              current
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-accent",
              // An empty section is dimmed but never hidden: knowing that
              // nobody has reported animals yet is information.
              !current && count === 0 && "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.65rem] leading-none tabular-nums",
                current
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
