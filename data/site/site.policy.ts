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

/** Merging duplicates is destructive to one of the two rows, so it stays with
 *  curators even though anyone can flag a duplicate. */
export function canMergeSite(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/**
 * Anyone at all can say a site is still open, or full, or closed — no account.
 *
 * Requiring a session here had the incentive backwards: the person standing in
 * front of the closed shelter, on someone else's phone, is the least likely to
 * have signed in, and they are the only one who actually knows. A false report
 * costs one confirmation; a map nobody can correct costs the city.
 */
export function canConfirmSite(): boolean {
  return true;
}

/**
 * Correcting a site's own fields — its type, name, address, hours, phone.
 * Anyone, with no account.
 *
 * A report is on the map the moment it lands, and the person who knows the
 * acopio closed at five, or that it is an albergue rather than a collection
 * point, is whoever is standing in front of it — which is exactly the person
 * least likely to hold an account, on a phone that may not be theirs.
 *
 * It is the same bar `canUpdateNeed` and `canConfirmSite` already sit
 * at, and the reasoning is the same one stated there: a wrong edit costs one
 * correction, and a map nobody can correct costs the city. What stays out of
 * reach is what an edit cannot undo — `published` (hiding), `remove`
 * (deleting) and the coordinate, which has its own rule in `canRelocate`.
 */
export function canEditSite(): boolean {
  return true;
}

/** Hiding or deleting a site outright — curators only. */
export function canManageSite(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
