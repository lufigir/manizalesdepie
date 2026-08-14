import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

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

/** Only a curator marks a report as checked against its source. */
export function canVerifyAnimal(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Taking a report off the board is destructive, so it stays with curators. */
export function canUnpublishAnimal(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
