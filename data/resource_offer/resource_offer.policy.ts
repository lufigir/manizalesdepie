/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/**
 * Anonymous, like reporting a site. An offer of a truck or a spare room does
 * not collect anyone else's contact details the way convening a jornada
 * does — the WhatsApp on the row is the offerer's own, published on purpose
 * so someone can ask — so it carries none of the reason `canCreateCall`
 * gates on an account.
 */
export function canProposeResourceOffer(): boolean {
  return true;
}
