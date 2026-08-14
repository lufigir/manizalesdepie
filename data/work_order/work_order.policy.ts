import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/** Anonymous, like reporting a site. Reporting debris does not collect
 *  anyone's contact details on the reporter's own behalf — if they type a
 *  third party's address into the form, that is the AGENTS.md guardrail's
 *  problem to solve with access control on the read side, not with a gate
 *  on the write side. */
export function canReportWorkOrder(): boolean {
  return true;
}

/**
 * Claiming requires an account — the same reasoning as `canCreateCall`, not
 * `canProposeSite`. A claim is a promise to actually go do the work, and it
 * unlocks the one thing this app treats as sensitive by default: the exact
 * address and phone of whoever is affected. A custodian of that has to be
 * someone real, not "anonymous browser #4".
 */
export function canClaimWorkOrder(user: CurrentUser | null): boolean {
  return user !== null;
}

/**
 * Who may read `work_order_contact`: the curator, and whoever currently
 * holds the claim — mirrors the RLS policy on the table itself (see
 * `work_order_contact_read_claimant` in the init migration). Stated here too
 * so a mistake in the DAL fails closed instead of relying on RLS alone to
 * catch it.
 */
export function canSeeWorkOrderContact(
  user: CurrentUser | null,
  workOrder: { claimedById: string | null; status: string },
): boolean {
  if (!user) return false;
  if (user.role === "curator") return true;
  return workOrder.claimedById === user.id && workOrder.status === "claimed";
}

/** Only the claimant or a curator closes a work order — an anonymous
 *  passer-by does not get to declare someone else's job done. */
export function canCloseWorkOrder(
  user: CurrentUser | null,
  workOrder: { claimedById: string | null },
): boolean {
  if (!user) return false;
  if (user.role === "curator") return true;
  return workOrder.claimedById === user.id;
}

/** Only a curator marks a work order as checked against its source. */
export function canVerifyWorkOrder(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
