"use client";

import { useEffect, useState } from "react";

/**
 * The wall clock, ticking by the second.
 *
 * Its job is not to tell the time — everyone's phone already does that. It is
 * to prove the page is live. On a map of an emergency the reader's first
 * unspoken question is "is this from right now, or is it a screenshot someone
 * forwarded me three days ago?", and a second hand answers it without a word.
 *
 * Pinned to America/Bogota rather than the device clock: a phone with the wrong
 * timezone would otherwise quietly contradict every "confirmado hace 10 min"
 * on the map.
 */
// 12-hour with a. m. / p. m., which is how the time is spoken and written in
// Colombia. The curfew is announced as "10:00 p. m. a 5:00 a. m.", so matching
// that format is what makes the two readable against each other.
const parts = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function read(now: Date) {
  const found = parts.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    found.find((part) => part.type === type)?.value ?? "";

  return {
    hm: `${get("hour")}:${get("minute")}`,
    s: get("second"),
    // es-CO renders this as "a. m." / "p. m."; normalised to a compact form so
    // it does not wrap the pill onto two lines.
    period: get("dayPeriod").replace(/\s|\./g, "").toUpperCase(),
  };
}

export function LiveClock() {
  // Starts null so the server and the first client paint agree. Rendering a
  // time during SSR would be a hydration mismatch by construction: the second
  // always moves between the two.
  const [now, setNow] = useState<{
    hm: string;
    s: string;
    period: string;
  } | null>(null);

  useEffect(() => {
    const tick = () => setNow(read(new Date()));
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="bg-background/90 pointer-events-auto flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur">
      <span className="bg-resolved size-2 animate-pulse rounded-full" />
      {/* Hours and minutes carry the weight, seconds ride along smaller — the
          phone lock-screen proportion. The seconds are the part that proves the
          page is live, so they are visible, not dominant.
          tabular-nums stops the digits from jittering the pill once a second,
          which reads as a glitch rather than as a clock. */}
      <time
        className="flex items-baseline gap-1 tabular-nums"
        aria-label="Hora actual en Colombia"
      >
        <span className="text-2xl leading-none font-semibold tracking-tight">
          {now.hm}
        </span>
        {/* Keeps the colon so it reads as one time. Without it, "09:46 32 PM"
            parses as a stray number wedged before the period. */}
        <span className="text-muted-foreground text-sm leading-none font-medium">
          :{now.s}
        </span>
        <span className="text-muted-foreground text-xs leading-none font-semibold">
          {now.period}
        </span>
      </time>
    </div>
  );
}
