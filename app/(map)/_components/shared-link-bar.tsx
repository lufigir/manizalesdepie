import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SHARED_LINK } from "@/lib/labels";

/**
 * The way out of a shared link.
 *
 * `/punto/[id]`, `/grupo/[id]`, `/necesidad/[id]`, `/mascota/[id]` and
 * `/servicio/[id]` all render the whole map, opened on one pin. Nothing is
 * hidden and nothing is filtered — the map is the context that makes the pin
 * mean something — but somebody who arrived from a WhatsApp group has no idea
 * they are on a route with a way out, and closing the card leaves them on a
 * page that looks like the app while quietly still being about one thing.
 *
 * So: a chip, top-left, the one corner the clock, the barrio badge, the map
 * controls and "Reportar" had not already taken. It goes to `/` — the main
 * map — rather than to the section the shared thing belongs to, because "ver
 * todo el mapa" has to land where it says it lands.
 *
 * A Server Component: a link and a label, no state of its own.
 */
export function SharedLinkBar() {
  return (
    <Link
      href="/"
      className="bg-background/90 focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.7rem] font-semibold shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2.5} aria-hidden />
      {SHARED_LINK.exit}
    </Link>
  );
}
