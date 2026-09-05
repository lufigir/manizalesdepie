import type { CurrentUser } from "@/data/user/current-user";

/**
 * Who may move a pin, and how far.
 *
 * A wrong coordinate is the one error on this map that actively costs
 * somebody something: it sends a volqueta to the wrong block. Every row on
 * the map arrived either from a form filled in on a street with one bar of
 * signal, or from a spreadsheet of press reports whose coordinates AGENTS.md
 * describes as "approximate and unverified". So correcting a pin has to be
 * something a neighbour can do, not a privilege — the person who knows the
 * street is almost never the person with an account.
 *
 * What a neighbour must not be able to do is move a case out of its barrio.
 * That is not a correction, it is a different case: the barrio drives the
 * panel's filter, the frente weighting and every count anyone reads, and a
 * pin walked across the city is indistinguishable from vandalism after the
 * fact. So the rule is the smallest one that allows the real correction and
 * refuses the destructive one:
 *
 *   - a curator moves a pin anywhere inside the covered area;
 *   - anybody else moves it anywhere INSIDE ITS OWN BARRIO;
 *   - a pin that resolves to no barrio at all — across the river in
 *     Villamaría, where we have no polygons — has no boundary to respect, so
 *     anybody may move it anywhere. Refusing there would freeze exactly the
 *     rows whose coordinates are least trustworthy.
 *
 * Pure, like every policy here: the DAL resolves both barrios and hands them
 * over. No database, no session lookup.
 */
export function canRelocate(
  user: CurrentUser | null,
  /** The barrio the pin is in today, as `neighborhood.id`, or null when it
   *  falls outside every polygon we hold. */
  currentNeighborhoodId: string | null,
  /** The barrio the destination falls in, resolved the same way. Null means
   *  the destination is outside every polygon. */
  targetNeighborhoodId: string | null,
): boolean {
  if (user?.role === "curator") return true;
  if (currentNeighborhoodId === null) return true;
  return targetNeighborhoodId === currentNeighborhoodId;
}
