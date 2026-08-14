import {
  HandHeart,
  LifeBuoy,
  MapPin,
  Megaphone,
  PawPrint,
  Shovel,
  Truck,
  type LucideIcon,
} from "lucide-react";

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
 */

export type TabId = "help" | "need" | "pets" | "services";

export type TabDef = {
  id: TabId;
  /** The URL segment. Spanish, because it is user-visible. */
  segment: string;
  href: string;
  label: string;
  /** The full sentence, for the hover title on desktop — where a tooltip
   *  actually works. */
  hint: string;
  /** The same content, cut to a few words. This is what is actually drawn
   *  under the label: a hover-only hint said nothing on a phone, which is
   *  most of this app's readers, so the tab itself carries a short preview
   *  of what's inside instead of asking someone to open it to find out. */
  subtitle: string;
  icon: LucideIcon;
};

/** Declaration order is display order. "Ayudar" is first because it is where
 *  most people who open this app are going. */
export const TABS: readonly TabDef[] = [
  {
    id: "help",
    segment: "ayudar",
    href: "/ayudar",
    label: "Ayudar",
    hint: "Acopios, sangre, jornadas y familias que piden",
    subtitle: "Acopios, sangre, jornadas",
    icon: HandHeart,
  },
  {
    id: "need",
    segment: "necesito",
    href: "/necesito",
    label: "Necesito",
    hint: "Albergues, censo y entrega de ayudas",
    subtitle: "Albergues, censo, ayudas",
    icon: LifeBuoy,
  },
  {
    id: "pets",
    segment: "mascotas",
    href: "/mascotas",
    label: "Mascotas",
    hint: "Perdidos, encontrados y avistados",
    subtitle: "Perdidos y encontrados",
    icon: PawPrint,
  },
  {
    id: "services",
    segment: "servicios",
    href: "/servicios",
    label: "Servicios",
    hint: "Volqueta, carro, herramienta, bodega, hogar de paso",
    subtitle: "Volqueta, herramienta, transporte",
    icon: Truck,
  },
] as const;

export const DEFAULT_TAB = TABS[0];

/** Resolves the segment Next reports for the active child route. Falls back to
 *  "Ayudar" so an unknown segment lands somewhere useful instead of blank. */
export function tabFromSegment(segment: string | null): TabId {
  return TABS.find((tab) => tab.segment === segment)?.id ?? DEFAULT_TAB.id;
}

export function tabDef(id: TabId): TabDef {
  return TABS.find((tab) => tab.id === id) ?? DEFAULT_TAB;
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

/**
 * Where the write buttons go from each section, and what they promise.
 *
 * One form per thing, never a generic one that opens by asking what this is:
 * the button the reporter pressed already answered that. Services has no entity
 * yet, so it has nowhere to point and shows nothing — an offer to report
 * something we cannot store is worse than no offer.
 *
 * "Ayudar" is the only section with two, and they are two because a place and a
 * shift are not the same kind of thing: an acopio is somewhere you can go, a
 * jornada is somewhere you have to be at an hour. Collapsing them into one form
 * with a first question would put the choice nobody came to make at the top of
 * the screen. Declaration order is display order, and the first one listed is
 * the one drawn as the primary button.
 *
 * "Necesito" says "reportar un punto" and not "pedir ayuda" on purpose: what it
 * creates today is a shelter or a census desk, and the household request that
 * would earn the second wording does not exist yet. A button that promises more
 * than the form delivers is read once and never trusted again.
 */
export const REPORT_ENTRY: Record<
  TabId,
  { href: string; label: string; icon: LucideIcon }[]
> = {
  help: [
    { href: "/reportar/ayudar", label: "Reportar un punto", icon: MapPin },
    // Megaphone rather than a calendar: "convocar" is calling people, not
    // scheduling an event — the icon should say who this button is for.
    { href: "/reportar/jornada", label: "Convocar una jornada", icon: Megaphone },
  ],
  need: [
    { href: "/reportar/necesito", label: "Reportar un punto", icon: MapPin },
    { href: "/reportar/escombros", label: "Reportar escombros o un daño", icon: Shovel },
  ],
  pets: [{ href: "/reportar/animal", label: "Reportar un animal", icon: PawPrint }],
  services: [
    { href: "/reportar/servicios", label: "Ofrecer un servicio", icon: Truck },
  ],
};
