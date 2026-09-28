import { z } from "zod";

/**
 * The one piece of `MapWorkspace` state that travels in the URL: which
 * barrio the panel is narrowed to. Everything else it offers — the active
 * chip, the search box, the selected pin — stays in memory only.
 *
 * A raw query string can be anything a client cares to send, including a
 * repeated key (`?barrio=a&barrio=b`, which Next hands back as an array) or
 * an empty string. This schema is the one place that turns "whatever
 * arrived on the wire" into a single trimmed candidate worth checking
 * against the barrios actually loaded, or nothing at all — never an error.
 */
const barrioParamSchema = z.string().trim().min(1).optional();

/**
 * Reads the raw `searchParams` a page receives and returns a barrio name
 * candidate, or `undefined` if none was sent or the value could not be
 * parsed as a single non-empty string.
 *
 * This does NOT check the candidate against the list of barrios that were
 * actually loaded — the caller does that, since it is the one holding that
 * list. An unmatched name falls back to "toda la ciudad" the same way an
 * unparsable one does.
 */
export function parseBarrioParam(searchParams: {
  [key: string]: string | string[] | undefined;
}): string | undefined {
  const raw = searchParams.barrio;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const result = barrioParamSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}
