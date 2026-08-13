import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects — which is
 * what makes them testable without a database and readable as a plain list of
 * the product's rules.
 */

/** Anyone may propose a site. Curation, not registration, is the gate: the
 *  point of the product is that a stranger with information can hand it over. */
export function canProposeSite(): boolean {
  return true;
}

/** Only a curator makes something visible to the city. */
export function canPublishSite(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Only a curator marks a site as checked against its source. */
export function canVerifySite(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Merging duplicates is destructive to one of the two rows, so it stays with
 *  curators even though anyone can flag a duplicate. */
export function canMergeSite(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Anyone signed in can say a site is still open, or full, or closed. This is
 *  the mechanism that keeps the map from rotting, so the bar is deliberately
 *  low: a false report costs one confirmation, an empty map costs the city. */
export function canConfirmSite(user: CurrentUser | null): boolean {
  return user !== null;
}

/** Editing the substance of a published site: the curator who owns the queue,
 *  or the person who proposed it while it is still pending. */
export function canEditSite(
  user: CurrentUser | null,
  site: { createdById: string | null; published: boolean },
): boolean {
  if (!user) return false;
  if (user.role === "curator") return true;
  return !site.published && site.createdById === user.id;
}
