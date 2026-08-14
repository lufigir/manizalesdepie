import {
  Boxes,
  HandHeart,
  Hospital,
  PawPrint,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { SiteType } from "@/data/site/site.dto";

/**
 * The map's layer taxonomy.
 *
 * Two kinds of layer that behave differently, which is the pattern Ushahidi and
 * Crisis Cleanup converged on:
 *
 *   ACTION  — what is happening and where you would go to do something.
 *             One at a time, because the point of choosing is to stop looking
 *             at everything else.
 *   CONTEXT — what exists. Stackable, because it is backdrop: it tells you
 *             where the hospital is while you look at the debris.
 *
 * The split is not cosmetic. Ushahidi's own manual warns that putting hospitals
 * and shelters in as *reports* makes them read as *incidents*, which "confuses
 * viewers" and clutters the response map. Anything permanent belongs in
 * context; anything that will be over in days belongs in action.
 *
 * Seven layers total is not a coincidence either — it is the count the
 * Watershed Post ran during Hurricane Sandy, the one readers praised for
 * "cleanliness and simplicity". Adding an eighth should mean removing one.
 */

export type ActionLayer = "help" | "requests" | "animals" | "resources";
export type ContextLayer = "infrastructure" | "comunas";

export type LayerDef = {
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const ACTION_LAYERS: Record<ActionLayer, LayerDef> = {
  help: {
    label: "Ayudar",
    hint: "Acopios, sangre, escombros y jornadas",
    icon: HandHeart,
  },
  requests: {
    label: "Piden ayuda",
    hint: "Familias que necesitan mercado, ropa, materiales",
    icon: Boxes,
  },
  animals: {
    label: "Animales",
    hint: "Perdidos, encontrados y hogar de paso",
    icon: PawPrint,
  },
  resources: {
    label: "Recursos",
    hint: "Volqueta, carro, herramienta, bodega",
    icon: Truck,
  },
};

export const CONTEXT_LAYERS: Record<ContextLayer, LayerDef> = {
  infrastructure: {
    label: "Infraestructura",
    hint: "Hospitales, albergues, censo",
    icon: Hospital,
  },
  comunas: {
    label: "Comunas",
    hint: "Límites de la ciudad",
    icon: Boxes,
  },
};

/**
 * Which layer each kind of site belongs to.
 *
 * A collection point and a blood drive are places you GO TO GIVE something, so
 * they are action. A hospital, a shelter or a census desk exist whether or not
 * anyone is helping today, so they are context. Same table, two layers — the
 * distinction is the reader's intent, not the row's shape.
 */
export const SITE_TYPE_LAYER: Record<SiteType, ActionLayer | ContextLayer> = {
  collection_point: "help",
  blood_donation: "help",
  shelter: "infrastructure",
  medical_post: "infrastructure",
  census_point: "infrastructure",
  water_point: "infrastructure",
  vet_clinic: "infrastructure",
};

export const LAYER_LABEL = {
  actionTitle: "¿Qué quieres hacer?",
  contextTitle: "Mostrar también",
  /** Shown when the chosen action layer has nothing in it yet. Says why it is
   *  empty rather than leaving the reader to guess the app is broken. */
  empty: "Todavía nadie ha reportado nada en esta capa.",
} as const;
