import { LifeBuoy, MapPin, Megaphone, PawPrint, Truck, type LucideIcon } from "lucide-react";

import type { SiteType } from "@/data/site/site.dto";

/**
 * The app's four intents — "¿qué vengo a hacer?" — organised by INTENT rather
 * than by kind of object.
 *
 * This replaces the old layer taxonomy, which mixed the two: "Ayudar" was an
 * intention and "Animales" was a kind of row, so the reader had to translate
 * their own situation into our data model before they could pick anything.
 *
 * Two rules fall out of that and are the reason the split is not arbitrary:
 *
 *   - A need is READ in "Ayudar" and WRITTEN from "Necesito". The person who
 *     types a request is affected; the person who reads it is about to act.
 *     One map, one question.
 *   - Donating blood is "Ayudar", not "Necesito" — the donor is giving.
 *
 * Each section owns its own report form. The section already says what is being
 * reported, so no form has to open by asking what kind of thing this is.
 *
 * None of the four has a route of its own any more. They used to (`/ayudar`,
 * `/necesito`, `/mascotas`, `/servicios`), each seeding one chip in
 * `UnifiedPanel` and rendering nothing else — but a chip is what a reader
 * ALREADY has, one tap away, at the bare `/`, so a dedicated URL for "open
 * with this chip pre-selected" was a second, thinner way to reach a screen
 * the reader was already on. `TabId` survives as a seed for the five shared
 * entity routes instead (`/punto/[id]` and friends still pick a starting
 * chip — see `initialChipForTab` — from the TYPE of the thing that was
 * shared, not from a route segment).
 */

export type TabId = "help" | "need" | "pets" | "services";

export const DEFAULT_TAB_ID: TabId = "help";

/**
 * Which section each kind of site belongs to, or `null` for the ones that are
 * no longer drawn at all.
 *
 * `water_point` and `vet_clinic` are deliberately out: people already know
 * where the vet is, and a water point that is not being actively curated is a
 * promise we cannot keep. The values stay in the database enum because Postgres
 * cannot drop one, and because rows already carrying them must keep validating.
 *
 * `medical_post` is the PMU — the unified command post. It is not a hospital,
 * it is where somebody who shows up wanting to help gets told where to go, so
 * it belongs in "Ayudar" with the rest of that answer.
 *
 * Still used for classification (counts, which route seeds which chip) even
 * though the map itself no longer hides a site for belonging to the "wrong"
 * one — see `UnifiedPanel`'s "Sitios" chip, which shows every type at once.
 */
export const SITE_TYPE_TAB: Record<SiteType, TabId | null> = {
  collection_point: "help",
  blood_donation: "help",
  medical_post: "help",
  shelter: "need",
  census_point: "need",
  water_point: null,
  vet_clinic: null,
};

/** What each section's own report form may create. Order is display order. */
export const TAB_SITE_TYPES: Record<"help" | "need", SiteType[]> = {
  help: ["collection_point", "blood_donation", "medical_post"],
  need: ["shelter", "census_point"],
};

export type ReportEntry = { href: string; label: string; icon: LucideIcon };

/**
 * `UnifiedPanel`'s own chips — the one filter surface the app has now, always
 * on screen together, wrapping onto a second row rather than hiding any of
 * them behind a scroll or a section of their own. "fronts" (the
 * neighborhood_need dashboard, see `FrontsList`) is deliberately not one of
 * these yet: the table and the component both exist and work, but with
 * nothing declared in it today a chip for it would open on an empty screen.
 * Add it back once the curator team starts declaring frentes.
 */
export type PanelChip = "all" | "calls" | "workOrders" | "sites" | "pets" | "services";

/** Which chip a fresh visit to each route opens the panel on. "Ayudar" seeds
 *  "all" — it is the section most people arrive at, and now that the map
 *  draws everything at once, "Todo" is the truer answer to "¿dónde ayudo
 *  hoy?" than any single chip would be. */
export function initialChipForTab(tab: TabId): PanelChip {
  switch (tab) {
    case "help":
      return "all";
    case "need":
      return "sites";
    case "pets":
      return "pets";
    case "services":
      return "services";
  }
}


/**
 * Every report form in the app, flattened into one list — what the map's one
 * "Reportar" button opens, on every chip.
 *
 * This used to be per-chip: a promoted primary action for each filter, plus a
 * secondary menu holding whatever that filter did not promote. The reason it
 * is gone is that the two things were never the same axis. A chip narrows
 * what the panel LISTS; it says nothing about what the reader has to report.
 * Someone filtering on "Grupos" because they are looking for a shift is
 * exactly as likely to be the person who then finds a lost dog — and under
 * the old rule, the form for that was not on their screen.
 *
 * Six entries is a long menu, and it is still the right one: the alternative
 * was a shorter menu that is sometimes missing the thing you came to write.
 */
export const ALL_REPORT_ENTRIES: ReportEntry[] = [
  { href: "/reportar/ayudar", label: "Reportar dónde ayudar", icon: MapPin },
  { href: "/reportar/armar-grupo", label: "Armar un grupo", icon: Megaphone },
  { href: "/reportar/necesito", label: "Reportar un punto de ayuda", icon: MapPin },
  { href: "/reportar/escombros", label: "Pedir ayuda", icon: LifeBuoy },
  { href: "/reportar/animal", label: "Reportar un animal", icon: PawPrint },
  { href: "/reportar/servicios", label: "Ofrecer un servicio", icon: Truck },
];
