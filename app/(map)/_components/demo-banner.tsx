import { FlaskConical } from "lucide-react";

import { DEMO_LABEL } from "@/lib/labels";

/**
 * The strip along the top of every map route.
 *
 * It is here for one reason, and it is not a disclaimer for our sake: this
 * map answers "¿dónde ayudo hoy?" convincingly enough that somebody arriving
 * from a search during a real emergency could believe it, and every phone
 * number on it is invented. So the first thing on the page says what the
 * page is.
 *
 * Quiet, one line, above the map rather than over it — the corners of the map
 * are already spoken for (the account bubble, the counters, "Reportar", the
 * map controls), and a floating chip in the middle of the top edge would sit
 * exactly where the first pin a reader looks at tends to be.
 *
 * The long sentence is the honest one and the short one is what fits on a
 * phone; both say "ficticios", which is the word that has to survive.
 */
export function DemoBanner() {
  return (
    <div className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center gap-2 border-b px-3 py-1 text-[0.7rem] leading-tight">
      <FlaskConical className="size-3 shrink-0" aria-hidden />
      <p className="truncate">
        <span className="text-foreground font-semibold">
          {DEMO_LABEL.banner}
        </span>
        <span aria-hidden> · </span>
        <span className="hidden sm:inline">{DEMO_LABEL.bannerBody}</span>
        <span className="sm:hidden">{DEMO_LABEL.bannerShort}</span>
      </p>
    </div>
  );
}
