import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/**
 * Anonymous, like reporting a site. An offer of a truck or a spare room does
 * not collect anyone else's contact details the way arming a grupo
 * does — the WhatsApp on the row is the offerer's own, published on purpose
 * so someone can ask — so it carries none of the reason `canCreateCall`
 * gates on an account.
 */
export function canProposeResourceOffer(): boolean {
  return true;
}

/** Editing any field, hiding or deleting an offer outright — curators only. */
export function canManageResourceOffer(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Only a curator marks an offer as checked against its source. */
export function canVerifyResourceOffer(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
