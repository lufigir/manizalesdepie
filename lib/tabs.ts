import { LifeBuoy, MapPin, Megaphone, PawPrint, Truck, type LucideIcon } from "lucide-react";

import type { SiteType } from "@/data/site/site.dto";

/**
 * The app's four top-level sections, organised by INTENT rather than by kind of
 * object.
 *
 * This replaces the old layer taxonomy, which mixed the two: "Ayudar" was an
 * intention and "Animales" was a kind of row, so the reader had to translate
 * their own situation into our data model before they could pick anything. The
 * question the product answers is "¿dónde ayudo hoy?", and the first screen
 * should be a straight answer to "¿qué vengo a hacer?".
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
 * What changed once the map became unified (see `MapWorkspace`): these four
 * no longer gate what is DRAWN — the map always shows everything now — nor
 * do they have a switcher of their own any more. `UnifiedPanel`'s own row of
 * chips (see `PanelChip` below) is the one control surface for filtering;
 * all four routes do today is decide which chip a fresh visit opens on (see
 * `initialChipForTab`) — enough to keep `/mascotas` a real, shareable URL,
 * not enough to need a button anywhere once the app is already open.
 */

export type TabId = "help" | "need" | "pets" | "services";

type TabRoute = { id: TabId; segment: string; href: string };

const TAB_ROUTES: readonly TabRoute[] = [
  { id: "help", segment: "ayudar", href: "/ayudar" },
  { id: "need", segment: "necesito", href: "/necesito" },
  { id: "pets", segment: "mascotas", href: "/mascotas" },
  { id: "services", segment: "servicios", href: "/servicios" },
];

export const DEFAULT_TAB_ID: TabId = "help";
export const DEFAULT_TAB_HREF: string = TAB_ROUTES[0].href;

/** Resolves the segment Next reports for the active child route. Falls back to
 *  "Ayudar" so an unknown segment lands somewhere useful instead of blank. */
export function tabFromSegment(segment: string | null): TabId {
  return TAB_ROUTES.find((tab) => tab.segment === segment)?.id ?? DEFAULT_TAB_ID;
}

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
 * The one filled, prominent action for a chip — what someone who opened the
 * app to DO something taps, not what they tap to describe something. Chips
 * with no entity of their own to report ("all", "sites") get none: "all" is
 * a survey, and "Sitios" mixes two report forms with no single obvious one
 * to promote (see `CHIP_REPORT_MENU`).
 */
export const CHIP_PRIMARY_ACTION: Partial<Record<PanelChip, ReportEntry>> = {
  calls: { href: "/reportar/armar-grupo", label: "Armar un grupo", icon: Megaphone },
  // "Pedir ayuda", not "Reportar un punto": what this form actually creates —
  // a work order someone with volqueta or manos can claim — is a household's
  // own request, not a place someone else built.
  workOrders: { href: "/reportar/escombros", label: "Pedir ayuda", icon: LifeBuoy },
  pets: { href: "/reportar/animal", label: "Reportar un animal", icon: PawPrint },
  services: { href: "/reportar/servicios", label: "Ofrecer un servicio", icon: Truck },
};

/**
 * Everything else worth reporting from a chip — reached through the
 * secondary "+" beside the primary button. Empty where the primary already
 * covers the chip's only entity, or where — "all" — the "+" carries every
 * form in the app instead (see `ALL_REPORT_ENTRIES`).
 */
export const CHIP_REPORT_MENU: Partial<Record<PanelChip, ReportEntry[]>> = {
  sites: [
    { href: "/reportar/ayudar", label: "Reportar dónde ayudar", icon: MapPin },
    { href: "/reportar/necesito", label: "Reportar un punto de ayuda", icon: MapPin },
  ],
};

/**
 * Every report form in the app, flattened into one list — what "Todo" opens
 * behind its own "+" instead of a single primary action. "Todo" has no one
 * obvious next step (it is a survey, not an intent), so it gets the full menu
 * rather than a guess at which form matters most.
 */
export const ALL_REPORT_ENTRIES: ReportEntry[] = [
  { href: "/reportar/ayudar", label: "Reportar dónde ayudar", icon: MapPin },
  { href: "/reportar/armar-grupo", label: "Armar un grupo", icon: Megaphone },
  { href: "/reportar/necesito", label: "Reportar un punto de ayuda", icon: MapPin },
  { href: "/reportar/escombros", label: "Pedir ayuda", icon: LifeBuoy },
  { href: "/reportar/animal", label: "Reportar un animal", icon: PawPrint },
  { href: "/reportar/servicios", label: "Ofrecer un servicio", icon: Truck },
];
