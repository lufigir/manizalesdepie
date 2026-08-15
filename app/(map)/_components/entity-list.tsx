"use client";

import { useEffect, useRef } from "react";

/**
 * One list, several families mixed by urgency (see `lib/urgency.ts`).
 *
 * Grouping is visual, not structural: a sticky header names whichever family
 * the eye is currently scrolled past, and it repeats every time urgency
 * hands the lead to a different family — a critical work order sitting
 * between two grupos gets its own "Escombros" header right there, which is
 * the point. Rows keep whatever they already render (`EntityCard` for a site
 * or a grupo, the full interactive card for a work order); this component
 * only supplies the scaffolding: sticky headers, empty state, and scrolling
 * the selected row into view.
 */
export type PanelListItem = {
  id: string;
  groupKey: string;
  groupLabel: string;
  node: React.ReactNode;
};

export function EntityList({
  items,
  selectedId,
  emptyLabel,
}: {
  items: PanelListItem[];
  /** Scrolled into view when it changes — set from the map or a shared link. */
  selectedId: string | null;
  emptyLabel: string;
}) {
  const refs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!selectedId) return;
    refs.current
      .get(selectedId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 p-1.5">
      {items.map((item, index) => {
        const previous = items[index - 1];
        const showHeader =
          item.groupLabel !== "" && (!previous || previous.groupKey !== item.groupKey);

        return (
          <li
            key={item.id}
            ref={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
          >
            {showHeader && (
              <p className="text-muted-foreground bg-background/95 sticky top-0 z-1 px-1 py-1 text-[0.65rem] font-semibold tracking-wide uppercase backdrop-blur-sm">
                {item.groupLabel}
              </p>
            )}
            {item.node}
          </li>
        );
      })}
    </ul>
  );
}
