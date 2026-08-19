import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/** Anonymous, like reporting a site. Reporting debris does not collect
 *  anyone's contact details on the reporter's own behalf — if they type a
 *  third party's address into the form, that is the AGENTS.md guardrail's
 *  problem to solve with access control on the read side, not with a gate
 *  on the write side. */
export function canReportNeed(): boolean {
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
 * `sync_need_state` needs two "ya ayudé" from two different numbers
 * before a case closes — so the thing this predicate lets anyone do is
 * contribute to a count, not set a state.
 */
export function canPostNeedUpdate(): boolean {
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
export function canCloseNeed(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/** Open to anyone: correcting a case's own category or description fixes a
 *  detail, it does not touch anything sensitive and it takes nothing off
 *  the map — the contact fields are not editable here. */
export function canUpdateNeed(): boolean {
  return true;
}

/** Hiding or deleting a case outright. Curators, like closing one. */
export function canManageNeed(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/**
 * Removing one entry from a case's book. Curators only.
 *
 * The book is append-only by design — it is the evidence behind a status
 * nobody can set by hand, and letting people delete entries would hand back
 * exactly the power the append-only rule took away: two "ya ayudé" close a
 * case, so anyone who could delete one could reopen any case at will, or
 * erase the "sigue haciendo falta" that was keeping one open.
 *
 * What is left for a curator is the thing an append-only log genuinely
 * cannot handle: an entry containing abuse, a phone number that should never
 * have been published, or spam. Deleting one re-fires
 * `sync_need_state`, so the case's status stays honest about whatever
 * entries remain.
 */
export function canDeleteNeedUpdate(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
