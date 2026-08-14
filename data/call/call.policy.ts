import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/**
 * The one action in this app that requires an account.
 *
 * Everything else — reporting an acopio, a shelter, a lost dog, a family's need
 * — stays anonymous, because the person with the information is often the least
 * likely to have signed in and the information is worth more than the identity.
 *
 * Convening a shift is different in kind. People rearrange a Saturday around it
 * and hand over their phone numbers to whoever called it. That makes the
 * organiser the custodian of other people's contact details during a looting
 * curfew, and a custodian has to be someone.
 */
export function canCreateCall(user: CurrentUser | null): boolean {
  return user !== null;
}

/**
 * The informal path never asks for an account, on purpose.
 *
 * `canCreateCall` gates on identity because a real organiser collects other
 * people's phone numbers. This path collects none — no attendance, no
 * organiser's WhatsApp, nothing but a pin and a category — so it carries none
 * of the reason the gate exists. It follows `canProposeSite`, not its
 * sibling above: this is a sighting, not a commitment.
 */
export function canCreateInformalCall(): boolean {
  return true;
}

/**
 * Anyone may move an informal pin — never a formal one.
 *
 * A formal jornada's meeting point is part of what its organiser committed
 * to; letting a stranger drag it would undo the one thing an account was
 * asked for in the first place. An informal pin has no organiser to
 * contradict, so the same openness that let anyone create it lets anyone
 * correct it — this is a wiki entry, not somebody's word. `raw.title` is the
 * signal because it is the DB-level fact `informal` is derived from (see
 * `CallDAL.toDTO`); by the time a `CallDTO` reaches here it never carries
 * null, so this checks the row itself, not the DTO.
 */
export function canRelocateInformalCall(call: { title: string | null }): boolean {
  return call.title === null;
}

/**
 * Signing up requires nothing at all — not even the phone number.
 *
 * Deliberately asymmetric with the rule above. Requiring an account to show up
 * with a shovel would filter out exactly the spontaneous volunteers who make up
 * most of the response in the first week, and an inflated headcount is a far
 * smaller harm than a brigade that nobody joined.
 */
export function canJoinCall(): boolean {
  return true;
}

/**
 * Who may read the volunteers' phone numbers: the person who called the shift,
 * and curators. Nobody else, ever — the public sees a count.
 *
 * This mirrors the row-level policy on `call_attendance` rather than replacing
 * it. The database is the guard; this is the same rule stated where the code
 * can read it, so a mistake here fails closed rather than opening a door.
 */
export function canSeeAttendees(
  user: CurrentUser | null,
  call: { createdById: string | null },
): boolean {
  if (!user) return false;
  if (user.role === "curator") return true;
  return call.createdById !== null && call.createdById === user.id;
}

/** Only a curator marks a call as checked against its source. */
export function canVerifyCall(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
