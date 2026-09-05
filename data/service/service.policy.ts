import type { CurrentUser } from "@/data/user/current-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/**
 * Anonymous, like reporting a site. An offer of a truck or a spare room does
 * not collect anyone else's contact details — the WhatsApp on the row is
 * the offerer's own, published on purpose so someone can ask.
 */
export function canProposeService(): boolean {
  return true;
}

/** Correcting a service's own fields — anyone, no account. Same bar as
 *  proposing one, and the same reasoning as `canEditSite`: the volqueta's
 *  owner should be able to fix their own listing without signing in. */
export function canEditService(): boolean {
  return true;
}

/** Hiding or deleting a service outright — curators only. Those are the two
 *  an edit cannot undo. */
export function canManageService(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
