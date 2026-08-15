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
 * Anonymous — "yo puedo atender" asks only for a name and a phone, the same
 * low-friction rule joining a grupo already follows. Several people can
 * attend the same case; nobody is a gatekeeper of it any more. What used to
 * live here (an account, because the claimant became custodian of
 * `work_order_contact`) moved to the read itself: attending reveals the
 * contact once, in the same response, logged either way — see
 * `WorkOrderDAL.attend`.
 */
export function canAttendWorkOrder(): boolean {
  return true;
}

/** Open to anyone, the same rule `canConfirmSite` already follows: closing
 *  says "this is done", not "trust me, I did it" — it exposes nothing, so
 *  it does not need to be gated by who is asking. */
export function canCloseWorkOrder(): boolean {
  return true;
}

/** Open to anyone, same reasoning as `canCloseWorkOrder`: correcting a
 *  case's own category or description fixes a detail, it does not touch
 *  anything sensitive — `work_order_contact` is not editable here. */
export function canUpdateWorkOrder(): boolean {
  return true;
}

/** Only a curator marks a work order as checked against its source. */
export function canVerifyWorkOrder(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
