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
      className="pointer-events-auto no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
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
              "focus-visible:ring-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none",
              current
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/90 hover:bg-accent",
              // An empty section is dimmed but never hidden: knowing that
              // nobody has reported animals yet is information.
              !current && count === 0 && "opacity-55",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            <span className="tabular-nums opacity-70">{count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
