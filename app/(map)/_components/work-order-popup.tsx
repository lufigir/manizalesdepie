"use client";

import { MapPin, Navigation, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import {
  SHEET_LABEL,
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  WORK_ORDER_ROLLUP_MARKER,
  WORK_ORDER_ROLLUP_STYLE,
  freshness,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

import { ShareButton } from "./share-button";
import { WorkOrderActions } from "./work-order-actions";

/**
 * The card that opens on a case's pin.
 *
 * This did not exist until now: the map rendered `WorkOrderItem`, the list
 * row, straight into the popup frame — which is exactly why a necesidad's
 * card looked nothing like a sitio's or a grupo's. Those two have always
 * had popups written as popups (icon chip, eyebrow, bold title, badge row,
 * a directions button), and a truncating one-line row wearing the same
 * frame reads as a different app.
 *
 * The order inside follows `CallPopup`'s reasoning rather than
 * `SitePopup`'s, because a case is read the same way a shift is: not "what
 * do they receive here" but "what is needed, where, and is anyone on it".
 * Name, then the ask, then the context around it, then what to do about it.
 *
 * The pin itself is only a block-level `approx_location`; the exact address
 * and the phone, when the reporter left them, are shown by
 * `WorkOrderActions` — public since 15 August, see AGENTS.md.
 */
export function WorkOrderPopup({ order }: { order: WorkOrderDTO }) {
  const rollup = workOrderRollup(order);
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const { label: freshLabel, stale } = freshness(
    order.confirmedAt,
    WORK_ORDER_LABEL.fresh,
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
    order.attendeeCount === 0
      ? order.helpedCount === 0
        ? WORK_ORDER_LABEL.attendeeCountNone
        : null
      : order.attendeeCount === 1
        ? WORK_ORDER_LABEL.attendeeCountOne
        : WORK_ORDER_LABEL.attendeeCountMany(order.attendeeCount),
    order.helpedCount === 0
      ? null
      : order.helpedCount === 1
        ? WORK_ORDER_LABEL.helpedCountOne
        : WORK_ORDER_LABEL.helpedCountMany(order.helpedCount),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex items-start gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            WORK_ORDER_ROLLUP_MARKER[rollup],
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
              {WORK_ORDER_LABEL.heading}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] leading-tight font-semibold",
                WORK_ORDER_ROLLUP_STYLE[rollup],
              )}
            >
              {WORK_ORDER_ROLLUP_LABEL[rollup]}
            </span>
          </div>
          {/* The category is the heading, like every other family's name is.
              The ask used to be, on the argument that "Riesgo estructural" is
              a label nobody can act on — true, but these descriptions run to
              142 characters, so as a heading it was five bold lines pushing
              the whole card below the fold. It is directly underneath, at
              reading weight, which is what a paragraph is for. */}
          <h2 className="text-sm leading-tight font-bold text-balance">
            {WORK_ORDER_CATEGORY_LABEL[order.category]}
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
        <span className={cn(stale && "text-claimed")}>{freshLabel}</span>
      </div>

      {/*
       * Above the tabs, not buried at the bottom of the contact block inside
       * "Detalle" — that spot disappeared entirely on "Hilo" and was the
       * last thing on the card even when it was visible. This is the control
       * the whole product runs on: nobody arrives here by browsing, every
       * reader showed up because somebody forwarded a link, and this is what
       * produces the next one. It has to survive whichever tab is open, so
       * it sits above them — full width, filled, its own row.
       */}
      <ShareButton
        path={`/necesidad/${order.id}`}
        title={`${WORK_ORDER_CATEGORY_LABEL[order.category]}${
          order.neighborhood ? ` · ${order.neighborhood}` : ""
        }`}
        text={order.description}
        className="w-full"
      />

      {/* Getting there, on its own row like the sitio and grupo cards: the
          pin is only a block-level `approx_location`, enough to drive to the
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

      <WorkOrderActions order={order} />
    </div>
  );
}
