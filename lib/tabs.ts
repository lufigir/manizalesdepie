import { LifeBuoy, MapPin, PawPrint, Truck, type LucideIcon } from "lucide-react";

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
 * None of the four has a route of its own: a chip is already one tap away at
 * the bare `/`, so a URL whose only job is "open with this chip selected"
 * would be a second, thinner way to reach a screen the reader is on.
 *
 * `TabId` earns its keep seeding the shared entity routes instead —
 * `/punto/[id]` and friends pick a starting chip through `initialChipForTab`,
 * from the TYPE of the thing that was shared rather than a route segment.
 */

export type TabId = "help" | "need" | "pets" | "services";

export const DEFAULT_TAB_ID: TabId = "help";

/**
 * Which section each kind of site belongs to.
 *
 * `medical_post` is the PMU — the unified command post. It is not a hospital,
 * it is where somebody who shows up wanting to help gets told where to go, so
 * it belongs in "Ayudar" with the rest of that answer.
 *
 * Still used for classification (counts, which route seeds which chip) even
 * though the map itself no longer hides a site for belonging to the "wrong"
 * one — see `UnifiedPanel`'s "Sitios" chip, which shows every type at once.
 */
export const SITE_TYPE_TAB: Record<SiteType, TabId> = {
  collection_point: "help",
  blood_donation: "help",
  medical_post: "help",
  shelter: "need",
  census_point: "need",
};

/**
 * What the site form may create. Order is display order: the three anyone can
 * walk into with something in their hands first, then the two an affected
 * family goes to.
 *
 * One list, not one per section. Splitting it in two produced two menu entries
 * that both said "reportar … ayuda" and both wrote the same table — see
 * `REPORT_LABEL.title`.
 */
export const REPORTABLE_SITE_TYPES: SiteType[] = [
  "collection_point",
  "blood_donation",
  "medical_post",
  "shelter",
  "census_point",
];

export type ReportEntry = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * The family's own hue, as a text token, for the icon on the menu row.
   *
   * It rides the entry rather than being switched on the href inside the
   * component, which is what the menu used to do — a `switch` over four
   * paths, each arm writing a different border, a different hover and a
   * different icon colour. That put the palette in a component (the rule
   * `eslint.config.mjs` enforces is about literal colours, but the spirit is
   * this) and it put four paths in two places, so adding a fifth form meant
   * remembering to come back here AND there.
   */
  tone: string;
};

/**
 * `UnifiedPanel`'s own chips — the one filter surface the app has now, always
 * on screen together, wrapping onto a second row rather than hiding any of
 * them behind a scroll or a section of their own.
 *
 * One chip per kind of thing that PERSISTS: a necesidad stays true until
 * somebody fixes it, a sitio until it closes, a mascota until it turns up.
 * Anything true for only one morning does not belong on a map — the reader
 * arrives hours later, and a pin that expired before they got there costs
 * more than it ever paid.
 */
export type PanelChip = "all" | "needs" | "sites" | "pets" | "services";

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
 * One flat list, not one per chip, because the two are not the same axis. A
 * chip narrows what the panel LISTS; it says nothing about what the reader
 * has to report. Someone filtering on "Sitios" looking for an acopio is
 * exactly as likely to be the person who then finds a lost dog, and the form
 * for that has to be on their screen.
 *
 * Four entries, four distinct verbs, four distinct icons, and each one named
 * after the chip that LISTS what it writes — "Necesidades" is read in the
 * panel and written here, "Sitios" likewise. A reader who learned the filter
 * has already learned the menu.
 *
 * It was six, and two of them ("Reportar dónde ayudar", "Reportar un punto de
 * ayuda") wrote the same `site` table under the same pin icon with two names
 * that are synonyms in Spanish. Whatever a menu costs in length, it costs far
 * more in a choice the reader cannot make.
 *
 * Order is urgency: the person who needs something comes before the person
 * offering it.
 */
export const ALL_REPORT_ENTRIES: ReportEntry[] = [
  {
    href: "/reportar/servicios",
    label: "Ofrecer un servicio",
    icon: Truck,
    tone: "text-muted-foreground",
  },
  {
    href: "/reportar/animal",
    label: "Reportar un animal",
    icon: PawPrint,
    tone: "text-pending",
  },
  {
    href: "/reportar/sitio",
    label: "Reportar un sitio",
    icon: MapPin,
    tone: "text-resolved",
  },
  {
    href: "/reportar/necesidad",
    label: "Reportar una necesidad",
    icon: LifeBuoy,
    tone: "text-pending",
  },
];
