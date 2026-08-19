"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ATTENDANCE_LABEL, needRollup } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

/**
 * How much of what has been reported still has nobody on it, top-right of
 * the map.
 *
 * This corner used to carry a chip naming the barrio under the cursor. It was
 * answering a question the map already answers — the outline is right there,
 * and the panel header names it too — while nothing on screen answered the
 * one the product is for.
 *
 * It follows the barrio filter, like the panel and unlike the map. Filtered
 * to San Joaquín the header goes primary and says "San Joaquín", and these
 * numbers are San Joaquín's; anything else would put a city-wide figure
 * directly under a heading naming one barrio.
 *
 * Shut by default, at every width. It opened automatically on a desktop for
 * one revision, on the reasoning that the corner is empty space there and the
 * rows cost the map nothing. Two behaviours for one widget is a thing to
 * learn twice, and the shut state is not a degraded version of the open one:
 * it already carries the count the map exists to surface, plus the bar. What
 * the chevron offers is the breakdown, never the answer — so there is no
 * width at which withholding it costs a reader anything.
 *
 * The colours are the marker ramp's, not new ones, so the bar and the pins
 * underneath it read as the same fact at two scales. `dismissed` cases are
 * left out of the total entirely: a case a curator closed as "no es real" is
 * not progress and should not lengthen the green.
 */
export function AttendanceStats() {
  const { needs } = useWorkspace();
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    let waiting = 0;
    let onTheWay = 0;
    let helped = 0;

    for (const order of needs) {
      switch (needRollup(order)) {
        // Both full-strength red for the same reason the marker draws them
        // that way: an untouched case and a reopened one are asking for
        // exactly the same thing.
        case "untouched":
        case "reopened":
          waiting += 1;
          break;
        case "onTheWay":
          onTheWay += 1;
          break;
        case "partial":
        case "advanced":
        case "done":
          helped += 1;
          break;
        // `dismissed` falls through, counted nowhere.
      }
    }

    return { waiting, onTheWay, helped, total: waiting + onTheWay + helped };
  }, [needs]);

  if (counts.total === 0) {
    return (
      <span className="bg-background/90 text-muted-foreground rounded-full border px-2.5 py-1 text-[0.65rem] font-medium shadow-sm backdrop-blur">
        {ATTENDANCE_LABEL.empty}
      </span>
    );
  }

  const summary = ATTENDANCE_LABEL.summary(
    counts.waiting,
    counts.onTheWay,
    counts.helped,
  );
  const bar = (
    <div
      className="bg-muted flex h-1.5 w-full gap-px overflow-hidden rounded-full"
      aria-hidden
    >
      <Segment count={counts.waiting} total={counts.total} className="bg-pending" />
      <Segment count={counts.onTheWay} total={counts.total} className="bg-underway" />
      <Segment count={counts.helped} total={counts.total} className="bg-resolved" />
    </div>
  );

  return (
    <div
      className={cn(
        "bg-background/95 flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 shadow-lg backdrop-blur transition-[width]",
        expanded ? "w-44" : "w-36",
      )}
      title={summary}
    >
      <p className="sr-only">{summary}</p>

      {/* The header IS the toggle, and shut it is already the reading: the
          count that is asking for somebody, in the colour that says so. The
          chevron offers the other two. */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={ATTENDANCE_LABEL.toggle}
        className="focus-visible:ring-ring flex items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="text-pending text-sm leading-none font-bold tabular-nums">
          {counts.waiting}
        </span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-left text-[0.65rem] font-medium">
          {ATTENDANCE_LABEL.waiting}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {bar}

      {/* One row per state, the full label beside the number.
          Three side-by-side columns lived here for one revision: at the size
          this corner can afford, each fragment had to be read on its own and
          the short ones ("van") came out as noise. Down the page each row is
          a phrase somebody finishes without deciding to. */}
      {expanded && (
        <div className="flex flex-col gap-1" aria-hidden>
          <Row
            value={counts.waiting}
            label={ATTENDANCE_LABEL.waiting}
            dot="bg-pending"
            tone="text-pending"
          />
          <Row
            value={counts.onTheWay}
            label={ATTENDANCE_LABEL.onTheWay}
            dot="bg-underway"
            tone="text-underway"
          />
          <Row
            value={counts.helped}
            label={ATTENDANCE_LABEL.helped}
            dot="bg-resolved"
            tone="text-resolved"
          />
        </div>
      )}
    </div>
  );
}

function Row({
  value,
  label,
  dot,
  tone,
}: {
  value: number;
  label: string;
  dot: string;
  tone: string;
}) {
  // A zero keeps its colour and loses its weight. It is still part of the
  // reading — "nadie va todavía" is the point — but it should not compete
  // with the count that is asking for somebody.
  const empty = value === 0;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dot, empty && "opacity-40")}
      />
      <span
        className={cn(
          "w-6 shrink-0 text-right text-sm leading-none font-bold tabular-nums",
          tone,
          empty && "opacity-50",
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-muted-foreground min-w-0 flex-1 truncate text-[0.65rem] leading-none",
          empty && "opacity-70",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Segment({
  count,
  total,
  className,
}: {
  count: number;
  total: number;
  className: string;
}) {
  if (count === 0) return null;
  // Inline width because the value is data, not a design decision — there is
  // no Tailwind class for "37.5%".
  return (
    <span className={className} style={{ width: `${(count / total) * 100}%` }} />
  );
}
