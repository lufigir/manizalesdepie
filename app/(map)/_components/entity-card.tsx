"use client";

import { PawPrint } from "lucide-react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { SiteDTO } from "@/data/site/site.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";
import {
  ANIMAL_KIND_STYLE,
  ANIMAL_LABEL,
  CALL_CATEGORY_ICON,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CALL_STATE_STYLE,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_STATUS_STYLE,
  SITE_TYPE_ICON,
  WORK_ORDER_CATEGORY_ICON,
  WORK_ORDER_CATEGORY_LABEL,
  WORK_ORDER_ROLLUP_LABEL,
  WORK_ORDER_ROLLUP_MARKER,
  WORK_ORDER_ROLLUP_STYLE,
  callState,
  workOrderRollup,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PanelEntity =
  | { kind: "site"; site: SiteDTO }
  | { kind: "call"; call: CallDTO }
  | { kind: "animal"; animal: AnimalDTO }
  | { kind: "resourceOffer"; offer: ResourceOfferDTO }
  | { kind: "workOrder"; order: WorkOrderDTO };

/**
 * One line per thing. The panel is an index, not a set of cards.
 *
 * It used to give every row two lines — name and badge above, then freshness,
 * confidence, barrio, category, hour, headcount below — which is a summary of
 * the card rather than a way into it. Tapping a row opens the card (a popup
 * beside the map, a drawer under it on a phone) and that card now holds every
 * one of those facts in full, so repeating a clipped version of them here cost
 * half the panel's height to say the same thing worse.
 *
 * What survives on the row is what the eye needs to pick one out of thirty:
 * the icon (what kind of thing), the marker colour (its state), the name, one
 * short qualifier, and the state badge. Everything else is one tap away.
 */
export function EntityCard({
  entity,
  selected,
  onSelect,
}: {
  entity: PanelEntity;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  switch (entity.kind) {
    case "site": {
      const { site } = entity;
      const Icon = SITE_TYPE_ICON[site.type];
      return (
        <Row
          id={site.id}
          title={site.name}
          // The barrio, not the type: the icon already carries the type, and
          // "¿dónde queda?" is the question a list of places is scanned with.
          detail={site.neighborhood}
          body={site.description}
          icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          iconClass={cn("rounded-full", SITE_STATUS_MARKER[site.status])}
          badge={SITE_STATUS_LABEL[site.status]}
          badgeClass={SITE_STATUS_STYLE[site.status]}
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
    case "call": {
      const { call } = entity;
      const Icon = CALL_CATEGORY_ICON[call.category];
      const state = callState(call);
      return (
        <Row
          id={call.id}
          title={call.title}
          // The barrio, like a sitio's row. There is no hour to qualify a
          // grupo with any more, and "¿dónde queda?" is the question a list
          // is scanned with either way.
          detail={call.neighborhood}
          body={call.description}
          icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          // A corner, not a circle: the same distinction the map markers draw
          // between a place you walk into and a shift you show up to.
          iconClass={cn("rounded-md", CALL_STATE_MARKER[state])}
          badge={CALL_STATE_LABEL[state]}
          badgeClass={CALL_STATE_STYLE[state]}
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
    case "animal": {
      const { animal } = entity;
      const resolved = animal.resolvedAt !== null;
      return (
        <Row
          id={animal.id}
          title={animal.petName ?? ANIMAL_LABEL[animal.species]}
          detail={animal.zone}
          // How to recognise it — the one thing that makes somebody who
          // just saw a dog on the street match it to this row.
          body={animal.description}
          icon={<PawPrint className="size-3.5" strokeWidth={2.5} aria-hidden />}
          iconClass="bg-muted rounded-full"
          badge={resolved ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]}
          badgeClass={
            resolved
              ? "bg-resolved-surface text-resolved border-resolved/30"
              : ANIMAL_KIND_STYLE[animal.kind]
          }
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
    case "workOrder": {
      const { order } = entity;
      const Icon = WORK_ORDER_CATEGORY_ICON[order.category];
      const rollup = workOrderRollup(order.status);
      return (
        <Row
          id={order.id}
          // A case has no name of its own, so the category is the title and
          // the barrio is what tells two "Escombros" apart.
          title={WORK_ORDER_CATEGORY_LABEL[order.category]}
          detail={order.neighborhood}
          // The only family that gets a body: "Escombros · Chipre" says
          // almost nothing on its own, and what makes somebody with a
          // volqueta stop on this row rather than the next one is the
          // sentence describing the job. Clamped to two lines — these run
          // to 142 characters on average, which is five.
          body={order.description}
          icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          iconClass={cn("rounded-md", WORK_ORDER_ROLLUP_MARKER[rollup])}
          badge={WORK_ORDER_ROLLUP_LABEL[rollup]}
          badgeClass={WORK_ORDER_ROLLUP_STYLE[rollup]}
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
    case "resourceOffer": {
      const { offer } = entity;
      const Icon = RESOURCE_TYPE_ICON[offer.type];
      return (
        <Row
          id={offer.id}
          title={RESOURCE_TYPE_LABEL[offer.type]}
          detail={offer.neighborhood}
          // Like a necesidad, the title here is only a category: the
          // description is what tells two volquetas apart.
          body={offer.description}
          icon={<Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
          iconClass="bg-muted rounded-full"
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
  }
}

/**
 * The row itself, shared by all four families.
 *
 * They were four near-identical buttons with the same padding, the same
 * anatomy and the same selection styling, which is four places for the next
 * spacing change to be applied in three of.
 *
 * `detail` sits inline after the title rather than on a line of its own, and
 * shrinks first: on a narrow panel the name is what must survive.
 */
function Row({
  id,
  title,
  detail,
  body,
  icon,
  iconClass,
  badge,
  badgeClass,
  selected,
  onSelect,
}: {
  id: string;
  title: string;
  detail?: string | null;
  /** A sentence under the identifying line, clamped to two lines. Only for a
   *  family whose title cannot identify the thing on its own. */
  body?: string | null;
  icon: React.ReactNode;
  iconClass: string;
  badge?: string;
  badgeClass?: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={selected}
      title={detail ? `${title} · ${detail}` : title}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent border-primary" : "border-transparent",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center",
            iconClass,
          )}
        >
          {icon}
        </span>

        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate text-sm leading-tight font-semibold">
            {title}
          </span>
          {/* Never truncated: a detail is short by construction (an hour, a
              barrio) and a clipped "Hoy 1…" answers nothing. The title cedes
              the width instead — it is the half a reader can still recognise
              from its first few words. */}
          {detail && (
            <span className="text-muted-foreground shrink-0 text-[0.7rem] whitespace-nowrap">
              {detail}
            </span>
          )}
        </span>

        {badge && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
              badgeClass,
            )}
          >
            {badge}
          </span>
        )}
      </span>

      {/* Indented to the title, not to the icon: it reads as the row's own
          sentence rather than as a second row underneath it. */}
      {body && (
        <span className="text-muted-foreground mt-0.5 line-clamp-2 pl-8 text-[0.7rem] leading-snug">
          {body}
        </span>
      )}
    </button>
  );
}
