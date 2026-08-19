"use client";

import { MapPin, Navigation, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NeedDTO } from "@/data/need/need.dto";
import {
  SHEET_LABEL,
  NEED_CATEGORY_ICON,
  NEED_CATEGORY_LABEL,
  NEED_LABEL,
  NEED_ROLLUP_LABEL,
  NEED_ROLLUP_MARKER,
  NEED_ROLLUP_STYLE,
  freshness,
  needRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { ShareButton } from "./share-button";
import { NeedActions } from "./need-actions";

/**
 * The card that opens on a case's pin.
 *
 * Written as a popup, like every other family's card (icon chip, eyebrow,
 * bold title, badge row, a directions button), not as the list row rendered
 * straight into the popup frame — a truncating one-line row wearing the
 * same frame would read as a different app.
 *
 * The order inside reads a case the way a shift is read: not "what do they
 * receive here" (see `SitePopup`) but "what is needed, where, and is anyone
 * on it". Name, then the ask, then the context around it, then what to do
 * about it.
 *
 * The pin itself is only a block-level `location`; the exact address
 * and the phone, when the reporter left them, are shown by
 * `NeedActions` (see AGENTS.md on why contact details are public).
 */
export function NeedPopup({ order }: { order: NeedDTO }) {
  const rollup = needRollup(order);
  const Icon = NEED_CATEGORY_ICON[order.category];
  const { label: freshLabel, stale } = freshness(
    order.confirmedAt,
    NEED_LABEL.fresh,
  );

  /**
   * Who is going and who already went, as one line.
   *
   * Both halves, because they answer different questions and a reader
   * deciding whether to drive over needs both: "dos van" and "uno ya ayudó"
   * are not the same case. It is also where the threshold becomes legible —
   * seeing "1 persona ya ayudó" next to a case that is still open is what
   * teaches that helping does not switch it off.
   */
  const people = [
    order.onTheWayCount === 0
      ? order.helpedCount === 0
        ? NEED_LABEL.onTheWayCountNone
        : null
      : order.onTheWayCount === 1
        ? NEED_LABEL.onTheWayCountOne
        : NEED_LABEL.onTheWayCountMany(order.onTheWayCount),
    order.helpedCount === 0
      ? null
      : order.helpedCount === 1
        ? NEED_LABEL.helpedCountOne
        : NEED_LABEL.helpedCountMany(order.helpedCount),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex items-start gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            NEED_ROLLUP_MARKER[rollup],
          )}
        >
          <Icon className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {/* Whether anyone has claimed this decides whether to go, so it is
              up here with the category rather than on a row of its own — and
              on the eyebrow rather than beside the ask, which is the line
              that needs every pixel it can get. */}
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground truncate text-[0.65rem] font-semibold tracking-wide uppercase">
              {NEED_LABEL.heading}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                NEED_ROLLUP_STYLE[rollup],
              )}
            >
              {NEED_ROLLUP_LABEL[rollup]}
            </span>
          </div>
          {/* The category is the heading, like every other family's name is
              — not the ask itself: "Riesgo estructural" is a label nobody
              can act on, but these descriptions run to 142 characters,
              which as a heading would be five bold lines pushing the whole
              card below the fold. The ask sits directly underneath, at
              reading weight, which is what a paragraph is for. */}
          <h2 className="text-sm leading-tight font-bold text-balance">
            {NEED_CATEGORY_LABEL[order.category]}
          </h2>
        </div>
      </header>

      <p className="text-[0.8rem] leading-snug whitespace-pre-line">
        {order.description}
      </p>

      {/* Block, headcount and freshness: three short facts that were three
          rows. On one row they read as what they are — the context around
          the ask, not three separate announcements. */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.7rem]">
        {order.neighborhood && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {order.neighborhood}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5 shrink-0" aria-hidden />
          {people}
        </span>
        <span className={cn(stale && "text-underway")}>{freshLabel}</span>
      </div>

      {/*
       * Above the tabs, not buried inside "Detalle": a spot there would
       * disappear entirely on "Hilo", and be easy to miss even on "Detalle".
       * This is the control the whole product runs on: nobody arrives here
       * by browsing, every reader showed up because somebody forwarded a
       * link, and this is what produces the next one. It has to survive
       * whichever tab is open, so it sits above them — full width, filled,
       * its own row.
       */}
      <ShareButton
        path={`/necesidad/${order.id}`}
        title={`${NEED_CATEGORY_LABEL[order.category]}${
          order.neighborhood ? ` · ${order.neighborhood}` : ""
        }`}
        text={order.description}
        className="w-full"
      />

      {/* Getting there, on its own row like the sitio and grupo cards: the
          pin is only a block-level `location`, enough to drive to the
          corner. It used to live inside "Detalle", where it read as the main
          thing to do with a case nobody had claimed — same argument that
          keeps `ShareButton` above the tabs. */}
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        render={
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <Navigation className="size-3.5" aria-hidden />
        {SHEET_LABEL.directions}
      </Button>

      <NeedActions order={order} />
    </div>
  );
}
