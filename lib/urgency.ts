import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { CallDTO } from "@/data/call/call.dto";
import type { NeighborhoodNeedDTO } from "@/data/neighborhood/neighborhood.dto";
import type { ResourceOfferDTO } from "@/data/resource_offer/resource_offer.dto";
import type { SiteDTO } from "@/data/site/site.dto";
import type { WorkOrderDTO } from "@/data/work_order/work_order.dto";

import { callState, workOrderRollup } from "./labels";

/**
 * One number, comparable across sites, grupos and work orders, so "Todo" can
 * be a single feed sorted by "¿qué es más urgente en la ciudad ahora?" rather
 * than three lists glued together in a fixed order.
 *
 * Bands are spaced apart on purpose (x10 between each) so a factor never
 * bleeds into the one above it — a barrio's declared priority always wins
 * over a status difference, a status difference always wins over how soon a
 * shift starts, and so on. See docs behind `neighborhood_need`: this is the
 * one axis curators control by hand, so it has to dominate everything else.
 */
const PRIORITY_WEIGHT: Record<NeighborhoodNeedDTO["priority"], number> = {
  critical: 30_000,
  high: 15_000,
  normal: 0,
};

/** Whether this barrio (and, when given, this category) has a declared
 *  frente, and how urgent the strongest one on record is.
 *
 *  Falls back from "matching category in this barrio" to "any category in
 *  this barrio" when nothing matches exactly — a work order's category rarely
 *  lines up 1:1 with `call_category` (only `debris_removal` does), and a site
 *  has no category at all, so the barrio-wide signal is what those two get. */
function neighborhoodPriority(
  neighborhood: string | null,
  needs: NeighborhoodNeedDTO[],
  category?: string,
): NeighborhoodNeedDTO["priority"] | null {
  if (!neighborhood) return null;

  const inBarrio = needs.filter((need) => need.name === neighborhood);
  if (inBarrio.length === 0) return null;

  const matching = category
    ? inBarrio.filter((need) => need.category === category)
    : [];
  const pool = matching.length > 0 ? matching : inBarrio;

  if (pool.some((need) => need.priority === "critical")) return "critical";
  if (pool.some((need) => need.priority === "high")) return "high";
  return "normal";
}

function priorityBonus(
  neighborhood: string | null,
  needs: NeighborhoodNeedDTO[],
  category?: string,
): number {
  const priority = neighborhoodPriority(neighborhood, needs, category);
  return priority ? PRIORITY_WEIGHT[priority] : 0;
}

/** Hours between two instants, always positive. */
function hoursBetween(a: number, b: number): number {
  return Math.abs(a - b) / 3_600_000;
}

/** Up to 200, decaying to 0 over two days — a recent confirmation nudges a
 *  row up when everything above it is tied, and never more than that. */
function freshnessBonus(confirmedAt: string, now: number): number {
  const hours = hoursBetween(now, new Date(confirmedAt).getTime());
  return Math.max(0, 200 - hours * (200 / 48));
}

export function siteUrgency(
  site: SiteDTO,
  needs: NeighborhoodNeedDTO[],
  now: number = Date.now(),
): number {
  const statusBand =
    site.status === "open" ? 3000 : site.status === "unknown" ? 1000 : 0;

  return (
    priorityBonus(site.neighborhood, needs) +
    statusBand +
    freshnessBonus(site.confirmedAt, now)
  );
}

export function callUrgency(
  call: CallDTO,
  needs: NeighborhoodNeedDTO[],
  now: number = Date.now(),
): number {
  const state = callState(call, now);
  const statusBand = state === "live" ? 3000 : state === "upcoming" ? 2000 : 0;

  // Only meaningful before it starts: a shift that starts in one hour pulls
  // ahead of one on Saturday, capped so it can never outweigh a live one.
  const hoursUntilStart = (new Date(call.startsAt).getTime() - now) / 3_600_000;
  const imminenceBonus =
    state === "upcoming" ? Math.max(0, 500 - hoursUntilStart * 20) : 0;

  return (
    priorityBonus(call.neighborhood, needs, call.category) +
    statusBand +
    imminenceBonus +
    freshnessBonus(call.confirmedAt, now)
  );
}

export function workOrderUrgency(
  order: WorkOrderDTO,
  needs: NeighborhoodNeedDTO[],
  now: number = Date.now(),
): number {
  const rollup = workOrderRollup(order.status);
  // "Atendido" sits below "en proceso" and above closed. Somebody has
  // already been, so it is the least urgent thing still open — but it IS
  // still open, and it needs a second pair of hands to close, so it must
  // not sink out of the feed the way a closed case does.
  const statusBand =
    rollup === "unclaimed"
      ? 3000
      : rollup === "claimed"
        ? 1500
        : rollup === "attended"
          ? 750
          : 0;

  return (
    priorityBonus(order.neighborhood, needs, order.category) +
    statusBand +
    freshnessBonus(order.confirmedAt, now)
  );
}

/** No barrio priority axis — a lost dog is not a declared frente — so this is
 *  just "still missing" against how recently it was confirmed. A reunited
 *  animal sinks to the bottom rather than clutter a feed about open cases. */
export function animalUrgency(
  animal: AnimalDTO,
  now: number = Date.now(),
): number {
  if (animal.resolvedAt) return 0;
  const kindBand = animal.kind === "lost" ? 3000 : 1500;
  return kindBand + freshnessBonus(animal.confirmedAt, now);
}

/** Same reasoning: an offer has no barrio-declared priority and no lifecycle
 *  beyond "still standing" — freshness alone decides its place among ties. */
export function resourceOfferUrgency(
  offer: ResourceOfferDTO,
  now: number = Date.now(),
): number {
  return 1500 + freshnessBonus(offer.confirmedAt, now);
}
