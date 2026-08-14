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
