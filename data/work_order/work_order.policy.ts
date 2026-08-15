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
 * Anonymous — an entry asks only for a name and a phone, the same
 * low-friction rule reporting anything else here already follows. This
 * covers all four kinds, including the two that dispute a case: saying
 * "sigue haciendo falta" has to be at least as easy as saying "ya ayudé",
 * or the counterweight does not work.
 *
 * Open does not mean consequence-free. No single entry decides anything —
 * `sync_work_order_state` needs two "ya ayudé" from two different numbers
 * before a case closes — so the thing this predicate lets anyone do is
 * contribute to a count, not set a state.
 */
export function canPostWorkOrderUpdate(): boolean {
  return true;
}

/**
 * Closing a case by hand is a curator's, and only a curator's.
 *
 * It used to return true for everybody, which meant one anonymous tap wrote
 * a terminal status and started the six-hour clock — a single bad actor
 * could take any case off the map, and `closed_rejected` in particular let
 * "this case annoys me" be recorded as "this was a lie" about a household
 * with no way to find out.
 *
 * The ordinary way a case ends is now the threshold in the database, which
 * no one person can reach alone. This is the exception for the two things a
 * count genuinely cannot decide: a real case that only one person ever
 * helped with, and a case that actually is fake.
 */
export function canCloseWorkOrder(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Open to anyone: correcting a case's own category or description fixes a
 *  detail, it does not touch anything sensitive and it takes nothing off
 *  the map — the contact fields are not editable here. */
export function canUpdateWorkOrder(): boolean {
  return true;
}

/** Hiding or deleting a case outright. Curators, like closing one. */
export function canManageWorkOrder(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
