/**
 * The curfew in force in Manizales, per the Alcaldía: 00:00 to 05:00.
 *
 * NOT 22:00 as the first press reports said. That was the original decree of
 * 10–11 August; by the 13th the Alcaldía had relaxed it to midnight, announced
 * day by day ("desde las 12:00 a. m. del viernes 14 de agosto y hasta las 5:00
 * a. m. del mismo día"). Getting this wrong in the direction of caution is not
 * harmless: it would grey out the whole evening and turn away people who can
 * legally go and help.
 *
 * Being announced daily, it is the kind of value that goes stale. If the app
 * ever runs past this emergency, it belongs in the database next to an
 * expires_at, not in a constant.
 *
 * Evaluated in Bogotá time on purpose. A phone with a wrong timezone would
 * otherwise decide whether the curfew applies, and it does not get a vote.
 */

const CURFEW_START_HOUR = 0;
const CURFEW_END_HOUR = 5;

const bogotaHour = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "numeric",
  hour12: false,
});

/** The hour of day in Bogotá, 0–23. */
export function hourInBogota(now: Date = new Date()): number {
  // Intl gives "24" rather than "0" for midnight in some runtimes; normalise so
  // the comparison below cannot silently miss the first hour of the curfew.
  return Number(bogotaHour.format(now)) % 24;
}

/**
 * Whether the curfew is in force right now.
 *
 * Handles both shapes deliberately. The decree has already moved once (22:00 →
 * 00:00) and is re-announced daily, so it may well move back. A window that
 * starts at 22:00 wraps midnight and needs an OR; one that starts at 00:00 does
 * not, and the same OR would then read `hour >= 0`, which is true at every hour
 * of the day — the app would declare a permanent curfew.
 */
export function isCurfew(now: Date = new Date()): boolean {
  const hour = hourInBogota(now);

  return CURFEW_START_HOUR < CURFEW_END_HOUR
    ? hour >= CURFEW_START_HOUR && hour < CURFEW_END_HOUR
    : hour >= CURFEW_START_HOUR || hour < CURFEW_END_HOUR;
}

export const CURFEW_LABEL = {
  notice: "Toque de queda: 12:00 a. m. a 5:00 a. m.",
  joinNow: "Quiero participar",
  joinTomorrow: "Apuntarme para mañana",
  explain:
    "A esta hora no se puede salir. Te apuntamos y el organizador te escribe mañana.",
} as const;
