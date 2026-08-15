"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  CALL_LABEL,
  LIST_LABEL,
  PANEL_LABEL,
  SECTION_EMPTY,
  SERVICES_LABEL,
  WORK_ORDER_LABEL,
} from "@/lib/labels";
import type { PanelChip } from "@/lib/tabs";
import {
  animalUrgency,
  callUrgency,
  resourceOfferUrgency,
  siteUrgency,
  workOrderUrgency,
} from "@/lib/urgency";
import { cn } from "@/lib/utils";

import { AnimalPanel } from "./animal-panel";
import { BarrioHeader } from "./barrio-header";
import { EntityCard } from "./entity-card";
import { EntityList, type PanelListItem } from "./entity-list";
import { ServicesPanel } from "./services-panel";
import { WorkOrderItem, WorkOrderList } from "./work-order-list";
import { useWorkspace } from "./workspace-context";

/**
 * The one panel every route renders now — what `SitePanel` was for
 * "Ayudar"/"Necesito" alone, extended to everything once the map stopped
 * hiding pins behind a section (see `MapWorkspace`).
 *
 * A single, always-present row of chips (see `PanelChip` in `lib/tabs.ts`)
 * replaces the two-tier system this used to have — a top-level section that
 * gated which sub-chips even existed. Managing everything from here is the
 * whole point now: whichever chip is open, the other five are still one tap
 * away, no trip back to the map's own (now icon-only, secondary) filter row
 * required.
 *
 * "Sitios" no longer splits by "Ayudar" vs "Necesito" — a shelter and an
 * acopio show up in the same list, search included. The distinction that
 * mattered (can I give here, or do I go here for help) is still legible from
 * each row's own type and status; it just is not a reason to hide one list
 * from the other any more.
 */
export function UnifiedPanel() {
  const {
    activeChip,
    setActiveChip,
    sites,
    calls,
    workOrders,
    animals,
    resourceOffers,
    neighborhoodNeeds,
    selectedId,
    select,
    barrio,
  } = useWorkspace();

  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredSites = useMemo(() => {
    if (!q) return sites;
    return sites.filter((site) =>
      [site.name, site.address, site.neighborhood]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [sites, q]);

  const chips: { id: PanelChip; label: string; count: number }[] = [
    {
      id: "all",
      label: PANEL_LABEL.all,
      count: sites.length + calls.length + workOrders.length + animals.length + resourceOffers.length,
    },
    { id: "calls", label: CALL_LABEL.heading, count: calls.length },
    { id: "workOrders", label: WORK_ORDER_LABEL.heading, count: workOrders.length },
    { id: "sites", label: PANEL_LABEL.sites, count: sites.length },
    { id: "pets", label: PANEL_LABEL.pets, count: animals.filter((a) => a.resolvedAt === null).length },
    { id: "services", label: SERVICES_LABEL.title, count: resourceOffers.length },
  ];

  const emptyMessage = barrio
    ? "Nadie ha reportado nada en este barrio todavía. Que esté vacío no quiere decir que no haga falta ayuda."
    : SECTION_EMPTY.all;

  const mixedItems: PanelListItem[] = useMemo(() => {
    // Only the ones still missing: a reunited pet is good news, not an open
    // case, the same rule the section's own count already follows.
    const openAnimals = animals.filter((animal) => animal.resolvedAt === null);

    // `now` defaults inside each `*Urgency` function rather than being read
    // once here — `Date.now()` is impure, and reading it directly in a
    // render/useMemo body is exactly the pattern React's purity rule flags.
    const scored = [
      ...sites.map((site) => ({
        id: site.id,
        groupKey: "sites",
        groupLabel: PANEL_LABEL.sites,
        score: siteUrgency(site, neighborhoodNeeds),
        node: (
          <EntityCard
            entity={{ kind: "site", site }}
            selected={site.id === selectedId}
            onSelect={select}
          />
        ),
      })),
      ...calls.map((call) => ({
        id: call.id,
        groupKey: "calls",
        groupLabel: CALL_LABEL.heading,
        score: callUrgency(call, neighborhoodNeeds),
        node: (
          <EntityCard
            entity={{ kind: "call", call }}
            selected={call.id === selectedId}
            onSelect={select}
          />
        ),
      })),
      ...workOrders.map((order) => ({
        id: order.id,
        groupKey: "workOrders",
        groupLabel: WORK_ORDER_LABEL.heading,
        score: workOrderUrgency(order, neighborhoodNeeds),
        node: (
          <WorkOrderItem
            order={order}
            selected={order.id === selectedId}
            onSelect={select}
          />
        ),
      })),
      ...openAnimals.map((animal) => ({
        id: animal.id,
        groupKey: "animals",
        groupLabel: PANEL_LABEL.pets,
        score: animalUrgency(animal),
        node: (
          <EntityCard
            entity={{ kind: "animal", animal }}
            selected={animal.id === selectedId}
            onSelect={select}
          />
        ),
      })),
      ...resourceOffers.map((offer) => ({
        id: offer.id,
        groupKey: "resourceOffers",
        groupLabel: SERVICES_LABEL.title,
        score: resourceOfferUrgency(offer),
        node: (
          <EntityCard
            entity={{ kind: "resourceOffer", offer }}
            selected={offer.id === selectedId}
            onSelect={select}
          />
        ),
      })),
    ];

    // Not destructured to drop `score`: PanelListItem tolerates the extra
    // field structurally, and stripping it here would need a name for the
    // dropped binding that lint would then flag as unused.
    return scored.sort((a, b) => b.score - a.score);
  }, [
    sites,
    calls,
    workOrders,
    animals,
    resourceOffers,
    neighborhoodNeeds,
    selectedId,
    select,
  ]);

  return (
    <>
      <BarrioHeader />

      {/* Wraps onto a second line rather than scrolling sideways. A hidden
          scrollbar (`overflow-x-auto` plus a no-scrollbar utility) reads
          fine on a phone, where a swipe is the everyday gesture — on a
          desktop with a plain mouse there is no obvious way to trigger a
          horizontal scroll at all, so six chips that do not fit just
          silently vanish past the edge. Wrapping guarantees every chip is
          always visible without depending on a gesture some inputs cannot
          make. */}
      <div className="flex shrink-0 flex-wrap gap-1.5 border-b p-2">
        {chips.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setActiveChip(option.id)}
            aria-pressed={activeChip === option.id}
            className={cn(
              "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeChip === option.id
                ? "bg-primary text-primary-foreground border-primary"
                : option.count === 0
                  ? "text-muted-foreground hover:bg-accent"
                  : "hover:bg-accent",
            )}
          >
            {option.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.65rem] leading-none tabular-nums",
                activeChip === option.id
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {activeChip === "sites" && (
        <div className="flex flex-col gap-1.5 border-b p-2">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={LIST_LABEL.searchPlaceholder}
              aria-label={LIST_LABEL.searchPlaceholder}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeChip === "all" && (
          <EntityList items={mixedItems} selectedId={selectedId} emptyLabel={emptyMessage} />
        )}

        {activeChip === "calls" && (
          <FlatEntityList
            items={calls.map((call) => ({
              id: call.id,
              node: (
                <EntityCard
                  entity={{ kind: "call", call }}
                  selected={call.id === selectedId}
                  onSelect={select}
                />
              ),
            }))}
            selectedId={selectedId}
            emptyLabel={CALL_LABEL.empty}
          />
        )}

        {activeChip === "workOrders" && (
          <WorkOrderList
            workOrders={workOrders}
            selectedId={selectedId}
            onSelect={select}
          />
        )}

        {activeChip === "sites" && (
          <>
            <p className="text-muted-foreground px-3 pt-2 text-xs tabular-nums">
              {filteredSites.length === 1
                ? LIST_LABEL.countOne
                : LIST_LABEL.countMany(filteredSites.length)}
            </p>
            <FlatEntityList
              items={filteredSites.map((site) => ({
                id: site.id,
                node: (
                  <EntityCard
                    entity={{ kind: "site", site }}
                    selected={site.id === selectedId}
                    onSelect={select}
                  />
                ),
              }))}
              selectedId={selectedId}
              emptyLabel={query.trim() ? LIST_LABEL.empty : emptyMessage}
            />
          </>
        )}

        {activeChip === "pets" && <AnimalPanel />}
        {activeChip === "services" && <ServicesPanel />}
      </div>
    </>
  );
}

/** A single-family chip's content: the same rows as the mixed list, no group
 *  header (the chip's own label already says what family this is), and no
 *  urgency reordering (each list already arrives sorted the way that family
 *  reads best — soonest-first for grupos, newest-confirmed for sitios). */
function FlatEntityList({
  items,
  selectedId,
  emptyLabel,
}: {
  items: { id: string; node: React.ReactNode }[];
  selectedId: string | null;
  emptyLabel: string;
}) {
  return (
    <EntityList
      items={items.map((item) => ({ ...item, groupKey: "flat", groupLabel: "" }))}
      selectedId={selectedId}
      emptyLabel={emptyLabel}
    />
  );
}
