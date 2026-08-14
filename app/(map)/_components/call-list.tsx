"use client";

import { useEffect, useRef } from "react";
import { Clock, Users } from "lucide-react";

import type { CallDTO } from "@/data/call/call.dto";
import {
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CALL_STATE_STYLE,
  callState,
  callWhen,
  slotsLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The jornadas tab in "Ayudar".
 *
 * Its own tab rather than mixed into the site list, because the two answer
 * different questions. A place is open for hours and you go when you can; a
 * shift is a time, it passes, and by tonight the same row is worth nothing.
 *
 * Selecting here selects on the map, exactly as the site list does — the two
 * halves share one selection, so nothing on screen ever disagrees with anything
 * else on screen. The heading and count live in the tab itself (see
 * PanelTabs), not here — this only ever renders once that tab is showing.
 */
export function CallList({
  calls,
  selectedId,
  onSelect,
}: {
  calls: CallDTO[];
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
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <ul className="flex flex-col gap-0.5">
        {calls.map((call) => {
          const active = call.id === selectedId;
          const state = callState(call);
          const Icon = CALL_CATEGORY_ICON[call.category];

          return (
            <li key={call.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) items.current.set(call.id, el);
                  else items.current.delete(call.id);
                }}
                onClick={() => onSelect(call.id)}
                aria-current={active}
                title={call.title}
                className={cn(
                  "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active ? "bg-accent border-primary" : "border-transparent",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md",
                      CALL_STATE_MARKER[state],
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
                    {call.title}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
                      CALL_STATE_STYLE[state],
                    )}
                  >
                    {CALL_STATE_LABEL[state]}
                  </span>
                </div>

                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-8 text-[0.7rem] font-medium">
                  <span className="text-muted-foreground font-normal">
                    {CALL_CATEGORY_LABEL[call.category]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    {callWhen(call)}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 font-normal">
                    <Users className="size-3" aria-hidden />
                    {slotsLabel(call)}
                  </span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
