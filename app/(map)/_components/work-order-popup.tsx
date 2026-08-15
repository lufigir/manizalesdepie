"use client";

import { MapPin, Navigation, Users } from "lucide-react";

import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import {
  CALL_LABEL,
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
 * So the ask gets the headline, and the block and the headcount sit right
 * under it.
 *
 * There is no exact address and there never will be — the public row only
 * carries a block-level `approx_location`, and the contact behind it is
 * revealed once, to whoever says they can attend (see AGENTS.md's guardrail
 * and `WorkOrderDAL.attend`).
 */
export function WorkOrderPopup({ order }: { order: WorkOrderDTO }) {
  const rollup = workOrderRollup(order.status);
  const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
  const { label: freshLabel, stale } = freshness(order.confirmedAt);

  const attendees =
    order.attendeeCount === 0
      ? WORK_ORDER_LABEL.attendeeCountNone
      : order.attendeeCount === 1
        ? WORK_ORDER_LABEL.attendeeCountOne
        : WORK_ORDER_LABEL.attendeeCountMany(order.attendeeCount);

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
              {WORK_ORDER_CATEGORY_LABEL[order.category]}
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
          {/* The ask is the heading. A category alone ("Riesgo estructural")
              is a label nobody can act on; "se necesitan lonas para cubrir
              casas" is the thing that makes someone load a truck. */}
          <h2 className="text-sm leading-tight font-bold text-balance">
            {order.description}
          </h2>
        </div>
      </header>

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
          {attendees}
        </span>
        <span className={cn(stale && "text-claimed")}>{freshLabel}</span>
      </div>

      {/* Only the approximate point — see the note at the top. Enough to
          drive to the block, which is what someone with a truck needs, and
          not the doorway of a house in a curfew. */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-secondary text-secondary-foreground flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold"
      >
        <Navigation className="size-3.5" aria-hidden />
        {CALL_LABEL.directions}
      </a>

      <WorkOrderActions order={order} />
    </div>
  );
}
