"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { PANEL_LABEL } from "@/lib/labels";

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

/**
 * One family's slice of the "Todo" view: its own header, its two most
 * urgent rows, and the way through to the rest.
 */
export type PanelSection = {
  key: string;
  label: string;
  items: { id: string; node: React.ReactNode }[];
  /** How many more of this family exist beyond the ones shown. Zero hides
   *  the "ver más" button entirely — there is nothing behind it. */
  hiddenCount: number;
  onSeeMore: () => void;
};

/**
 * "Todo", sectioned.
 *
 * The mixed urgency-interleaved list this replaces answered "what is most
 * urgent in the whole city" — true, but it also meant one busy family could
 * fill the panel and bury every other one, so the reader had to scroll a
 * long way to find out grupos even existed. Two per family and a way
 * through to the rest keeps "Todo" as an index of what exists rather than a
 * queue: each family still leads with its most urgent, and the depth lives
 * one tap away in that family's own chip.
 */
export function SectionedEntityList({
  sections,
  selectedId,
  emptyLabel,
}: {
  sections: PanelSection[];
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

  const populated = sections.filter((section) => section.items.length > 0);

  if (populated.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm text-balance">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-1.5">
      {populated.map((section) => (
        <section key={section.key} className="flex flex-col gap-0.5">
          <p className="text-muted-foreground bg-background/95 sticky top-0 z-1 px-1 py-1 text-[0.65rem] font-semibold tracking-wide uppercase backdrop-blur-sm">
            {section.label}
          </p>

          <ul className="flex flex-col gap-1.5">
            {section.items.map((item) => (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) refs.current.set(item.id, el);
                  else refs.current.delete(item.id);
                }}
              >
                {item.node}
              </li>
            ))}
          </ul>

          {section.hiddenCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={section.onSeeMore}
              className="mt-1 w-full"
            >
              {PANEL_LABEL.seeMore(section.hiddenCount)}
            </Button>
          )}
        </section>
      ))}
    </div>
  );
}

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
