import type { CurrentUser } from "@/data/user/require-user";

/**
 * Pure predicates. No database, no session lookup, no side effects.
 */

/**
 * Reporting a grupo asks for nothing, like every other report here.
 *
 * This used to be the one action in the app that required an account. The
 * gate was never about trusting the information — it was about the phone
 * numbers an organiser collected from the people who signed up, which made
 * them the custodian of other people's contact details during a looting
 * curfew. The roster is gone, so the custody is gone, and with it the only
 * argument for turning away someone who has something to report and no
 * account.
 */
export function canCreateCall(): boolean {
  return true;
}

/**
 * Anyone may move a pin, within its own barrio.
 *
 * The old rule let anyone move an informal pin and nobody move a formal one,
 * because a scheduled shift's meeting point was part of what its organiser
 * committed to. Nobody commits to anything here now: this is a wiki entry, so
 * the same openness that let anyone create it lets anyone correct it. The
 * barrio check that keeps a correction from becoming a relocation lives in
 * `CallDAL.relocate`, which needs the row to compare against.
 */
export function canRelocateCall(): boolean {
  return true;
}

/** Editing any field, hiding or deleting a grupo outright — curators only. */
export function canManageCall(user: CurrentUser | null): boolean {
  return user?.role === "curator";
}
