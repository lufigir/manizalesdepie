/**
 * Pins that share the exact same coordinate, pushed apart.
 *
 * A ring that opened whenever pins merely *looked* close on screen lived here
 * once and was removed for good reasons: it moved a pin away from where the
 * place actually is, and it recomputed on every zoom, so the map shuffled
 * under the hand trying to read it. Both objections turn on the pin having a
 * true position that the ring was lying about.
 *
 * Neither objection survives an exact collision. When two rows carry the
 * identical longitude and latitude — two offers pinned at their barrio's
 * centroid, two needs reported from the same doorway — there is no position
 * the drawing could be honest about, because one pin is simply invisible
 * underneath the other. So the fan applies to that case only.
 *
 * It is a pixel offset, computed once from the group, ordered by id: the same
 * arrangement at every zoom, in every session, for every reader. Nothing
 * re-shuffles, because nothing here depends on the camera.
 */

export type FannedPoint = {
  id: string;
  longitude: number | null;
  latitude: number | null;
};

/** How far from the true point the fanned pins sit, in CSS pixels. Roughly one
 *  marker's width, so neighbouring pins touch rather than overlap. */
const RADIUS = 18;

/** A pixel offset per id, for the ids that need one. Ids alone in their spot
 *  are absent from the map, so a caller reads `?? undefined` and MapLibre keeps
 *  its own default. */
export type FanOffsets = ReadonlyMap<string, [number, number]>;

/**
 * Builds the offsets for every family at once.
 *
 * Deliberately takes all the points together rather than one list per marker
 * component: a need and a site can land on the same corner just as easily as
 * two needs can, and a per-family fan would leave exactly that pair still
 * stacked. Rows with no coordinate are skipped — they are never drawn.
 */
export function fanOutCollisions(groups: FannedPoint[][]): FanOffsets {
  const byPosition = new Map<string, string[]>();

  for (const group of groups) {
    for (const point of group) {
      if (point.longitude === null || point.latitude === null) continue;

      // Fixed precision, not the raw float: two rows written from the same
      // centroid can differ in the last bit after a round trip through JSON,
      // and 7 decimals is ~1 cm — far below anything a reader could act on.
      const key = `${point.longitude.toFixed(7)},${point.latitude.toFixed(7)}`;
      const bucket = byPosition.get(key);
      if (bucket) bucket.push(point.id);
      else byPosition.set(key, [point.id]);
    }
  }

  const offsets = new Map<string, [number, number]>();

  for (const ids of byPosition.values()) {
    if (ids.length < 2) continue;

    // Sorted by id so the arrangement is a property of the data, not of the
    // order the four families happened to be listed in above.
    ids.sort();

    // Straight up for the first pin, then evenly around. Up because that is
    // where a marker's own tooltip and label already point, so the pin at the
    // top of the fan reads as the one anchored to the spot.
    for (const [index, id] of ids.entries()) {
      const angle = (2 * Math.PI * index) / ids.length - Math.PI / 2;
      offsets.set(id, [
        Math.round(Math.cos(angle) * RADIUS),
        Math.round(Math.sin(angle) * RADIUS),
      ]);
    }
  }

  return offsets;
}
