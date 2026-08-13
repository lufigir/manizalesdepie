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
};

/** Tailwind classes, resolved from the semantic layer tokens in globals.css.
 *  Never a literal colour: the palette is defined in one place. */
export const SITE_TYPE_COLOR: Record<SiteType, string> = {
  collection_point: "bg-layer-collection",
  shelter: "bg-layer-shelter",
  blood_donation: "bg-layer-blood",
  vet_clinic: "bg-layer-animals",
  water_point: "bg-layer-water",
  medical_post: "bg-layer-medical",
};

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  open: "Abierto",
  full: "Lleno",
  closed: "Cerrado",
  unknown: "Sin confirmar",
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
