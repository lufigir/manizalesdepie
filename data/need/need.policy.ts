import type { CurrentUser } from "@/data/user/current-user";

import type { NeedStatus, NeedUpdateKind } from "./need.dto";

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
 * Open does not mean consequence-free. No single entry decides anything: the
 * status is read back out of the whole book by `deriveNeedState` below, so
 * the thing this predicate lets anyone do is contribute to a count, not set
 * a state. Nothing an entry can say closes a case.
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
 * There is no ordinary way a case ends any more — a case cools instead of
 * closing. This is the exception for the two things a count genuinely cannot
 * decide: a real case that only one person ever helped with, and a case that
 * actually is fake.
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
 * exactly the power the append-only rule took away: anyone who could delete
 * an entry could erase the "sigue haciendo falta" that is keeping a case
 * red, or the help that turned it green.
 *
 * What is left for a curator is the thing an append-only log genuinely
 * cannot handle: an entry containing abuse, a phone number that should never
 * have been published, or spam. The state is derived from whatever entries
 * remain, so removing one keeps the case honest by construction.
 */
export function canDeleteNeedUpdate(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}

/**
 * The state of a case, read out of its own book.
 *
 * This is `sync_need_state` — the Postgres trigger that used to run on every
 * insert into `need_updates` — as a pure function. It moved here rather than
 * being dropped with the database because the rule it encodes is the product:
 * nobody writes a status, everybody writes an entry, and the status is what
 * the entries add up to. AGENTS.md states it as a guardrail; this is where it
 * is now enforced.
 *
 * Two readers, one copy: the DAL derives the state of a fixture case, and the
 * browser derives it again the moment somebody adds an entry of their own, so
 * a pin recolours without a round trip. Pure, so both can.
 *
 *   nothing yet ........................ pending
 *   ≥1 "voy" ........................... on_the_way
 *   ≥1 "ya ayudé" ...................... attended
 *   "sigue haciendo falta" last ........ attended, but `reopened`
 *
 * `reopened` is a colour, not a status: `needRollup` paints a contested case
 * red again while it stays `attended`, because people did turn up and the
 * thread should keep saying so. A curator's verdict freezes everything —
 * later entries still move the counts, never the status.
 */
export function deriveNeedState(
  entries: { kind: NeedUpdateKind; createdAt: string }[],
  closedStatus: "closed_completed" | "closed_rejected" | null,
  /** What `confirmed_at` falls back to on a case nobody has written on: when
   *  it was reported. */
  createdAt: string,
): {
  status: NeedStatus;
  onTheWayCount: number;
  helpedCount: number;
  reopened: boolean;
  confirmedAt: string;
} {
  const onTheWayCount = entries.filter((e) => e.kind === "on_the_way").length;
  const helpedCount = entries.filter((e) => e.kind === "helped").length;

  const last = (kind: NeedUpdateKind) =>
    entries
      .filter((entry) => entry.kind === kind)
      .reduce<string | null>(
        (latest, entry) =>
          latest === null || entry.createdAt > latest ? entry.createdAt : latest,
        null,
      );

  const lastHelped = last("helped");
  const lastStillNeeded = last("still_needed");

  const reopened =
    lastStillNeeded !== null &&
    (lastHelped === null || lastStillNeeded > lastHelped);

  const status: NeedStatus =
    closedStatus ??
    (helpedCount >= 1 ? "attended" : onTheWayCount >= 1 ? "on_the_way" : "pending");

  const confirmedAt = entries.reduce(
    (latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest),
    createdAt,
  );

  return { status, onTheWayCount, helpedCount, reopened, confirmedAt };
}
