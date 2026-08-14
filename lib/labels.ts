import {
  ClipboardList,
  Cross,
  GlassWater,
  Droplet,
  Package,
  PawPrint,
  Tent,
  type LucideIcon,
} from "lucide-react";

import type { ItemMode, SiteStatus, SiteType } from "@/data/site/site.dto";

/**
 * The interface speaks Spanish; the code and the database speak English. This
 * module is the single crossing point, so a label is never hardcoded inside a
 * component and never drifts between two screens.
 */

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  collection_point: "Acopio",
  shelter: "Albergue",
  blood_donation: "Sangre",
  vet_clinic: "Veterinaria",
  water_point: "Agua",
  medical_post: "Salud",
  census_point: "Censo",
};

/**
 * The icon carries the type; the colour carries the status. Crisis Cleanup
 * settled on that split after years of real disasters, and the reason is that
 * you need both facts at once — what is this, and does it help me right now —
 * and one colour cannot say two things.
 *
 * Water is a glass and blood is a drop on purpose: two drops side by side would
 * be the one confusion that sends someone to the wrong place.
 */
export const SITE_TYPE_ICON: Record<SiteType, LucideIcon> = {
  collection_point: Package,
  shelter: Tent,
  blood_donation: Droplet,
  vet_clinic: PawPrint,
  water_point: GlassWater,
  medical_post: Cross,
  census_point: ClipboardList,
};

/** Marker fill. This is the status axis, so it is the one the eye reads first
 *  at map scale, before any icon resolves. */
export const SITE_STATUS_MARKER: Record<SiteStatus, string> = {
  open: "bg-resolved text-resolved-foreground",
  full: "bg-claimed text-claimed-foreground",
  closed: "bg-unclaimed text-unclaimed-foreground",
  unknown: "bg-stale text-background",
};

/** Tailwind classes, resolved from the semantic layer tokens in globals.css.
 *  Never a literal colour: the palette is defined in one place.
 *  Used on the detail sheet's type badge, where the badge also carries its
 *  name in text, so the colour is decoration rather than the encoding. */
export const SITE_TYPE_COLOR: Record<SiteType, string> = {
  collection_point: "bg-layer-collection",
  shelter: "bg-layer-shelter",
  blood_donation: "bg-layer-blood",
  vet_clinic: "bg-layer-animals",
  water_point: "bg-layer-water",
  medical_post: "bg-layer-medical",
  census_point: "bg-layer-census",
};

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  open: "Abierto",
  full: "Lleno",
  closed: "Cerrado",
  // "Sin dato", not "Sin confirmar": confidence already owns that phrase, and
  // the two mean different things. This one says nobody knows whether the place
  // is receiving people; the other says nobody has vouched for the report at
  // all. Seeing the same words twice on one card taught neither.
  unknown: "Sin dato",
};

export const SITE_STATUS_STYLE: Record<SiteStatus, string> = {
  open: "bg-resolved-surface text-resolved border-resolved/30",
  full: "bg-claimed-surface text-claimed border-claimed/30",
  closed: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  unknown: "bg-stale-surface text-stale border-stale/30",
};

export const ITEM_MODE_LABEL: Record<ItemMode, string> = {
  needed: "Necesita",
  not_accepted: "NO recibe",
  sufficient: "Ya tiene suficiente",
};

/**
 * Sign-in. Deliberately framed around what an account is FOR — claiming a work
 * order, taking a slot — because nobody signs in to a map for fun. Reading the
 * map never asks for an account, and the copy has to say so or people bounce.
 */
export const AUTH_LABEL = {
  title: "Entra para ayudar",
  subtitle:
    "Solo necesitas cuenta para apuntarte a una jornada o hacerte cargo de un caso. Ver el mapa nunca la pide.",
  google: "Continuar con Google",
  signOut: "Cerrar sesión",
  back: "Volver al mapa",
  failed: "No se pudo iniciar sesión. Vuelve a intentarlo.",
  /** Shown at the publish gate. Says WHY the account is needed, at the moment
   *  it is asked for — not as a rule in the abstract. */
  gateReason:
    "Guardamos lo que escribiste. Solo pedimos cuenta para crear jornadas, porque otras personas se apuntan contando contigo y recibes sus contactos.",
  errorTitle: "No pudimos completar el ingreso",
  errorBody:
    "El enlace pudo haber vencido o ya se usó. Intenta entrar otra vez desde el mapa.",
} as const;

/**
 * Everything the detail sheet says. These used to be hardcoded inside the
 * component, which is the drift this module exists to prevent.
 */
export const SHEET_LABEL = {
  close: "Cerrar",
  address: "Dirección",
  schedule: "Horario",
  directions: "Cómo llegar",
  whatsapp: "WhatsApp",
  share: "Compartir",
  copied: "Enlace copiado",
  confirmPrompt: "¿Estás ahí ahora? Dinos cómo lo encontraste:",
} as const;

/**
 * Confidence, shown rather than filtered by.
 *
 * The old model held a report back until a curator approved it, which in a fast
 * emergency makes the reviewer the bottleneck and the information arrives too
 * late to matter. Ushahidi's own guidance is the opposite: publish, label the
 * uncertainty, and let the reader judge — leaving something "unverified" beats
 * hiding it, and beats deleting it.
 */
export type Confidence = "unconfirmed" | "confirmed" | "verified";

export function confidence(site: {
  verified: boolean;
  confirmedCount: number;
}): { level: Confidence; label: string } {
  if (site.verified) {
    return { level: "verified", label: "Verificado por un curador" };
  }
  if (site.confirmedCount > 0) {
    return {
      level: "confirmed",
      label:
        site.confirmedCount === 1
          ? "1 persona confirmó"
          : `${site.confirmedCount} personas confirmaron`,
    };
  }
  return { level: "unconfirmed", label: "Sin confirmar" };
}

/** How solid the marker looks. Faint is not hidden: an unconfirmed report is
 *  still the only warning anyone has, and it stays on the map. */
export const CONFIDENCE_MARKER: Record<Confidence, string> = {
  unconfirmed: "opacity-55",
  confirmed: "",
  verified: "ring-verified ring-[3px]",
};

export const CONFIDENCE_BADGE: Record<Confidence, string> = {
  unconfirmed: "bg-stale-surface text-stale border-stale/30",
  confirmed: "bg-resolved-surface text-resolved border-resolved/30",
  verified: "bg-verified/10 text-verified border-verified/30",
};

/**
 * The public report form.
 *
 * Worded for someone standing on a street with one bar of signal, not for
 * someone filling in a database. "¿Qué hay aquí?" rather than "Tipo de sitio";
 * the pin is dragged, never typed as coordinates.
 */
export const REPORT_LABEL = {
  title: "Reportar un punto",
  subtitle:
    "Sale al mapa de una vez, marcado como sin confirmar. Otras personas lo confirman o lo corrigen.",
  kind: "¿Qué hay aquí?",
  where: "¿Dónde queda?",
  whereHint: "Arrastra el mapa hasta que el punto quede en el sitio exacto.",
  name: "Nombre del lugar",
  namePlaceholder: "Coliseo Menor, Sede comunal San José…",
  address: "Dirección o referencia",
  addressPlaceholder: "Frente a la panadería, casa 141…",
  description: "¿Qué hacen o qué necesitan?",
  descriptionPlaceholder:
    "Reciben mercado y kits de aseo. No reciben ropa usada.",
  schedule: "Horario",
  schedulePlaceholder: "Abierto 24 horas, 8 a. m. a 6 p. m.…",
  whatsapp: "WhatsApp de contacto",
  whatsappPlaceholder: "3001234567",
  whatsappHint: "Opcional. Queda visible para quien quiera ir o ayudar.",
  submit: "Publicar en el mapa",
  submitting: "Publicando…",
  cancel: "Cancelar",
  nearbyTitle: "Ya hay algo muy cerca",
  nearbyBody:
    "Si es el mismo lugar, confírmalo en vez de crear otro pin: así sube su confianza en el mapa.",
  nearbyOpen: "Ver ese punto",
  nearbyIgnore: "No es el mismo, publicar igual",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/** The Alcaldía's daily balance card. */
export const SITUATION_LABEL = {
  title: "Balance de la ciudad",
  affected: "damnificados",
  evaluations: "Evaluaciones de estructuras",
  villages: "Veredas con afectación",
  homes: "Viviendas afectadas",
  homesPartial: "parcial",
  homesTotal: "total o casi total",
  evacuated: "Familias con evacuación oficial",
  injured: "Heridos",
  dead: "Fallecidos",
  merchants: "Comerciantes afectados",
  gas: "Usuarios sin gas",
  inShelters: "en albergues",
} as const;

/** The comuna tooltip. "Sin puntos reportados" is deliberately about reports,
 *  not about reality: an empty comuna may be well served or simply unseen, and
 *  the map only ever knows the second. */
export const COMUNA_LABEL = {
  empty: "Sin puntos reportados",
  summary: (total: number, open: number) =>
    `${total} ${total === 1 ? "punto" : "puntos"} · ${open} abierto${open === 1 ? "" : "s"}`,
} as const;

/** The list beside the map. The filter matches what is already loaded, so the
 *  wording promises filtering and not searching the city. */
export const LIST_LABEL = {
  searchPlaceholder: "Filtrar por nombre o barrio",
  countOne: "1 punto",
  countMany: (n: number) => `${n} puntos`,
  empty: "Ningún punto coincide.",
} as const;

const relative = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

/**
 * How long ago someone last confirmed this. A datum nobody has vouched for in
 * days is not hidden — it is labelled, and the reader decides.
 */
export function freshness(confirmedAt: string): {
  label: string;
  stale: boolean;
} {
  const elapsedMs = Date.now() - new Date(confirmedAt).getTime();
  const hours = Math.floor(elapsedMs / 3_600_000);

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(elapsedMs / 60_000));
    return { label: `Confirmado ${relative.format(-minutes, "minute")}`, stale: false };
  }
  if (hours < 24) {
    return { label: `Confirmado ${relative.format(-hours, "hour")}`, stale: hours >= 12 };
  }

  const days = Math.floor(hours / 24);
  return { label: `Sin confirmar ${relative.format(-days, "day")}`, stale: true };
}
