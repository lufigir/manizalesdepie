import type { NeighborhoodDTO } from "@/data/neighborhood/neighborhood.dto";
import type { CurrentUser } from "@/data/user/current-user";

import type { AnimalDTO } from "./animal.dto";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

export type AnimalMapCoordinates = { longitude: number; latitude: number };

/** Where to draw the pin: the exact sighting when one was placed, otherwise
 *  the barrio centroid named in `zone`. Returns null when there is neither. */
export function animalMapCoordinates(
  animal: AnimalDTO,
  barriosByName: ReadonlyMap<string, NeighborhoodDTO>,
): AnimalMapCoordinates | null {
  if (animal.longitude !== null && animal.latitude !== null) {
    return { longitude: animal.longitude, latitude: animal.latitude };
  }

  if (!animal.zone) return null;

  const barrio = barriosByName.get(animal.zone);
  if (!barrio) return null;

  return { longitude: barrio.longitude, latitude: barrio.latitude };
}

/** Anyone may report an animal, with no account. Someone who just found a dog
 *  in the street is exactly the person least likely to have one. */
export function canReportAnimal(): boolean {
  return true;
}

/**
 * Anyone may mark an animal as home.
 *
 * The bar is deliberately as low as reporting. The person who reunites a dog
 * is usually not the one who posted it, and a "resolved" flag nobody can set
 * leaves the board full of animals that were found weeks ago — which is worse
 * than an occasional wrong close, because it buries the ones still missing.
 */
export function canResolveAnimal(): boolean {
  return true;
}

/** Taking a report off the board is destructive, so it stays with curators. */
export function canUnpublishAnimal(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Correcting a report's own fields — anyone, no account. The bar is the same
 *  as reporting one and as `canResolveAnimal`, for the same reason: the
 *  person who has new information about a lost dog is rarely the one who
 *  posted it. */
export function canEditAnimal(): boolean {
  return true;
}

/** Hiding or deleting a report outright — curators only. Those are the two an
 *  edit cannot undo. */
export function canManageAnimal(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
