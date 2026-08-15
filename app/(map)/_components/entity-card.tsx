"use client";

import { Clock, PawPrint, Users } from "lucide-react";

import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { SiteDTO } from "@/data/site/site.dto";
import {
  ANIMAL_KIND_STYLE,
  ANIMAL_LABEL,
  CALL_CATEGORY_ICON,
  CALL_CATEGORY_LABEL,
  CALL_STATE_LABEL,
  CALL_STATE_MARKER,
  CALL_STATE_STYLE,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABEL,
  SITE_STATUS_LABEL,
  SITE_STATUS_MARKER,
  SITE_STATUS_STYLE,
  SITE_TYPE_ICON,
  SITE_TYPE_LABEL,
  callState,
  callWhen,
  confidence,
  freshness,
  slotsLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PanelEntity =
  | { kind: "site"; site: SiteDTO }
  | { kind: "call"; call: CallDTO }
  | { kind: "animal"; animal: AnimalDTO }
  | { kind: "resourceOffer"; offer: ResourceOfferDTO };

/**
 * One row shape for a site and a grupo, the two families that were each
 * drawing their own card before this — same padding, same two-line anatomy,
 * same selection styling, so the reader's eye does not have to relearn a
 * layout every time the family changes in a mixed "Todo" list.
 *
 * The one thing that stays different on purpose is the icon chip's shape:
 * `rounded-full` for a site (a place you can walk into), `rounded-md` for a
 * grupo (a pin with a corner) — the same distinction the map markers already
 * draw, carried into the list so the two surfaces teach one grammar instead
 * of two.
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
    case "site":
      return <SiteRow site={entity.site} selected={selected} onSelect={onSelect} />;
    case "call":
      return <CallRow call={entity.call} selected={selected} onSelect={onSelect} />;
    case "animal":
      return <AnimalRow animal={entity.animal} selected={selected} onSelect={onSelect} />;
    case "resourceOffer":
      return <ResourceOfferRow offer={entity.offer} selected={selected} onSelect={onSelect} />;
  }
}

function SiteRow({
  site,
  selected,
  onSelect,
}: {
  site: SiteDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = SITE_TYPE_ICON[site.type];
  const { label: freshLabel, stale } = freshness(site.confirmedAt);
  const { label: confidenceLabel } = confidence(site);

  return (
    <button
      type="button"
      onClick={() => onSelect(site.id)}
      aria-current={selected}
      title={site.name}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent border-primary" : "border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            SITE_STATUS_MARKER[site.status],
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
          {site.name}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            SITE_STATUS_STYLE[site.status],
          )}
        >
          {SITE_STATUS_LABEL[site.status]}
        </span>
      </div>

      <p
        className={cn(
          "mt-0.5 truncate pl-8 text-[0.7rem]",
          stale ? "text-claimed" : "text-muted-foreground",
        )}
      >
        {SITE_TYPE_LABEL[site.type]} · {freshLabel} · {confidenceLabel}
        {site.neighborhood && ` · ${site.neighborhood}`}
      </p>
    </button>
  );
}

function CallRow({
  call,
  selected,
  onSelect,
}: {
  call: CallDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = CALL_CATEGORY_ICON[call.category];
  const state = callState(call);

  return (
    <button
      type="button"
      onClick={() => onSelect(call.id)}
      aria-current={selected}
      title={call.title}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent border-primary" : "border-transparent",
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
  );
}

/** A compact row for "Todo" — the rich photo card lives in `AnimalBoard`,
 *  reserved for when "Mascotas" is the active filter and there is room for
 *  it. Here the row only has to say enough to decide whether to switch over. */
function AnimalRow({
  animal,
  selected,
  onSelect,
}: {
  animal: AnimalDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const resolved = animal.resolvedAt !== null;
  const { label: freshLabel } = freshness(animal.confirmedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(animal.id)}
      aria-current={selected}
      title={animal.petName ?? animal.description}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent border-primary" : "border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
          <PawPrint className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
          {animal.petName ?? ANIMAL_LABEL[animal.species]}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold",
            resolved
              ? "bg-resolved-surface text-resolved border-resolved/30"
              : ANIMAL_KIND_STYLE[animal.kind],
          )}
        >
          {resolved ? ANIMAL_LABEL.resolved : ANIMAL_LABEL[animal.kind]}
        </span>
      </div>

      <p className="text-muted-foreground mt-0.5 truncate pl-8 text-[0.7rem]">
        {freshLabel}
        {animal.zone && ` · ${animal.zone}`}
      </p>
    </button>
  );
}

/** Same trade as `AnimalRow`: the full card with the "escríbeme" link lives
 *  in `ServicesPanel`'s grid; here it is one line among grupos and sitios. */
function ResourceOfferRow({
  offer,
  selected,
  onSelect,
}: {
  offer: ResourceOfferDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = RESOURCE_TYPE_ICON[offer.type];
  const { label: freshLabel } = freshness(offer.confirmedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(offer.id)}
      aria-current={selected}
      title={offer.description}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent border-primary" : "border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
          {RESOURCE_TYPE_LABEL[offer.type]}
        </p>
      </div>

      <p className="text-muted-foreground mt-0.5 truncate pl-8 text-[0.7rem]">
        {offer.description} · {freshLabel}
        {offer.neighborhood && ` · ${offer.neighborhood}`}
      </p>
    </button>
  );
}
