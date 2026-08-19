import type { AnimalDTO } from "@/data/animal/animal.dto";
import type { NeedDTO } from "@/data/need/need.dto";
import type { ServiceDTO } from "@/data/service/service.dto";
import type { SiteDTO } from "@/data/site/site.dto";

import { needRollup } from "./labels";

/**
 * One number, comparable across sites, necesidades, animals and services, so
 * "Todo" can be a single feed sorted by "¿qué es más urgente en la ciudad
 * ahora?" rather than four lists glued together in a fixed order.
 *
 * Two inputs only: status and freshness. Nothing here is hand-weighted by a
 * barrio or a curator, so the ordering stays reproducible from the row itself
 * and nobody has to keep a priority table current for the feed to be right.
 */

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

export function siteUrgency(site: SiteDTO, now: number = Date.now()): number {
  const statusBand =
    site.status === "open" ? 3000 : site.status === "unknown" ? 1000 : 0;

  return statusBand + freshnessBonus(site.confirmedAt, now);
}

export function needUrgency(order: NeedDTO, now: number = Date.now()): number {
  const rollup = needRollup(order);
  // The same order the marker's colour ramp draws, as numbers.
  //
  // `reopened` ties with `untouched` at the top rather than sitting below it:
  // somebody went, it was not enough, and a person stood there and said so —
  // that is a better-evidenced need than one nobody has visited at all.
  //
  // Both helped bands stay well clear of zero. A case people have worked on
  // is the least urgent thing still OPEN, but it is still open, and sinking it
  // to the bottom of the feed is how a house that needs four more Saturdays
  // stops getting them.
  const statusBand =
    rollup === "untouched" || rollup === "reopened"
      ? 3000
      : rollup === "onTheWay"
        ? 1500
        : rollup === "partial"
          ? 900
          : rollup === "advanced"
            ? 600
            : 0;

  return statusBand + freshnessBonus(order.confirmedAt, now);
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

/** Same reasoning: a service has no barrio-declared priority and no lifecycle
 *  beyond "still standing" — freshness alone decides its place among ties. */
export function serviceUrgency(
  service: ServiceDTO,
  now: number = Date.now(),
): number {
  return 1500 + freshnessBonus(service.confirmedAt, now);
}
