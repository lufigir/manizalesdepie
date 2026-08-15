import {
  Boxes,
  Car,
  ClipboardList,
  Construction,
  Cross,
  GlassWater,
  Droplet,
  HardHat,
  HeartPulse,
  Home,
  Package,
  PawPrint,
  Shovel,
  Tent,
  Truck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { CallCategory, CallDTO } from "@/data/call/call.dto";
import type { NeedPriority } from "@/data/neighborhood/neighborhood.dto";
import type { ResourceType } from "@/data/resource_offer/resource_offer.dto";
import type { ItemMode, SiteStatus, SiteType } from "@/data/site/site.dto";
import type {
  WorkOrderCategory,
  WorkOrderStatus,
  WorkOrderUpdateKind,
} from "@/data/work_order/work_order.dto";
import type { PanelChip } from "@/lib/tabs";

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

/**
 * "Abierto/Cerrado" reads as business hours, and half of what this status
 * covers is not a business: a family's living room taking in donations, a
 * parish organising an acopio in its atrio. "Disponible" asks the question
 * that actually matters here — can I bring something right now — instead of
 * one that only some of these places can honestly answer.
 */
export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  open: "Disponible",
  full: "Sin cupo",
  closed: "No disponible",
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
    "Solo necesitas cuenta para hacerte cargo de un caso. Reportar y ver el mapa nunca la piden.",
  google: "Continuar con Google",
  signOut: "Cerrar sesión",
  back: "Volver al mapa",
  failed: "No se pudo iniciar sesión. Vuelve a intentarlo.",
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
  /** Short on purpose: on a phone the long version ("¿Estás ahí ahora? Dinos
   *  cómo lo encontraste:") wrapped onto a second line above three buttons
   *  that already say what they do. */
  confirmPrompt: "¿Estás ahí? Confirma cómo está:",
  description: "Descripción",
} as const;

/**
 * The card the map opens on a selected pin, as a surface rather than as any
 * one family's content.
 *
 * Below `lg` it is a drawer along the bottom edge of the map and these are
 * the strings it needs; from `lg` up the same content rides MapLibre's own
 * anchored popup, which has no chrome of its own to name.
 */
export const MAP_CARD = {
  close: "Cerrar la tarjeta",
  /** Named for a screen reader, which cannot see which pin it belongs to. */
  region: "Detalle del punto seleccionado",
} as const;

/**
 * Arriving from a link somebody pasted into a group.
 *
 * The chip this labels is the only explicit way out of a shared route, and it
 * says where it goes rather than "volver": whoever tapped the link came from
 * WhatsApp, not from our home page, so "atrás" would name a place they have
 * never been.
 */
export const SHARED_LINK = {
  exit: "Ver todo el mapa",
} as const;

/**
 * Confidence, shown rather than filtered by.
 *
 * The old model held a report back until a curator approved it, which in a fast
 * emergency makes the reviewer the bottleneck and the information arrives too
 * late to matter. Ushahidi's own guidance is the opposite: publish, label the
 * uncertainty, and let the reader judge — leaving something unconfirmed beats
 * hiding it, and beats deleting it.
 *
 * There used to be a third level above these two, "verificado por un curador".
 * It was removed the 15th along with the column behind it: this project is not
 * going to have a curator team, so that rung was never going to be reached,
 * and a level nobody can climb to does not read as "not yet" — it reads as a
 * judgement that was made. Two levels that people can actually produce beat
 * three where the top one is decorative.
 */
export type Confidence = "unconfirmed" | "confirmed";

export function confidence(site: {
  confirmedCount: number;
}): { level: Confidence; label: string; short: string } {
  if (site.confirmedCount > 0) {
    return {
      level: "confirmed",
      label:
        site.confirmedCount === 1
          ? "1 persona confirmó"
          : `${site.confirmedCount} personas confirmaron`,
      // `short` exists because the sentence above is a badge on a card two
      // hundred pixels wide, where it wraps onto three lines and pushes the
      // name of the place off the row. The full sentence survives in the
      // detail sheet, where there is room to say who confirmed and how many.
      short: `${site.confirmedCount} ✓`,
    };
  }
  return {
    level: "unconfirmed",
    label: "Sin confirmar",
    short: "Sin confirmar",
  };
}

/** How solid the marker looks. Faint is not hidden: an unconfirmed report is
 *  still the only warning anyone has, and it stays on the map. */
export const CONFIDENCE_MARKER: Record<Confidence, string> = {
  unconfirmed: "opacity-55",
  confirmed: "",
};

export const CONFIDENCE_BADGE: Record<Confidence, string> = {
  unconfirmed: "bg-stale-surface text-stale border-stale/30",
  confirmed: "bg-resolved-surface text-resolved border-resolved/30",
};

/*
 * A `verification()` helper lived here for exactly one afternoon.
 *
 * It reported the one confidence signal the four non-sitio families could
 * carry, now that their `confirmed_count` was gone: whether a curator had
 * checked the row. Removing verification removed the only thing it had left
 * to say, so those families carry no confidence badge at all — just how long
 * ago somebody last touched them, which `freshness` already answers.
 */

/**
 * The public report form.
 *
 * Worded for someone standing on a street with one bar of signal, not for
 * someone filling in a database. "¿Qué hay aquí?" rather than "Tipo de sitio";
 * the pin is dragged, never typed as coordinates.
 */
export const REPORT_LABEL = {
  /**
   * One form for every kind of place, after two of them ("Reportar dónde
   * ayudar" and "Reportar un punto de ayuda") turned out to be the same
   * sentence twice. Both wrote a `site` row, both carried the same pin icon,
   * and the only thing separating them was who benefits — a distinction the
   * reader had to work out BEFORE tapping anything.
   *
   * Reading is organised by intent; writing is organised by the object in
   * front of you. "Esto es un acopio" is decided in a second; "¿esto es dónde
   * ayudo o es un punto de ayuda?" is not decided at all.
   */
  title: "Reportar un sitio",
  kind: "¿Qué es este lugar?",
  subtitle:
    "Sale al mapa de una vez, marcado como sin confirmar. Otras personas lo confirman o lo corrigen.",
  barrio: "¿En qué barrio?",
  where: "Ajusta el punto",
  whereHint:
    "El mapa ya está en el barrio. Arrastra unos metros hasta el sitio exacto.",
  whereLocked: "Elige el barrio y el mapa se abre ahí.",
  barrioRequired:
    "Elige primero el barrio. Sin eso el punto queda en el centro de la ciudad, que es peor que no publicarlo.",
  name: "Nombre del lugar",
  namePlaceholder: "Coliseo Menor, Sede comunal San José…",
  /** Was "Dirección o referencia", optional, and near the bottom. It is now
   *  required and sits right under the barrio, because between the two of them
   *  they carry the precision that dragging a pin across the city used to. */
  address: "¿Dónde exactamente?",
  addressPlaceholder: "Frente a la panadería, casa 141…",
  addressHint:
    "La cuadra, la esquina, el punto de referencia. Es lo que hace que alguien lo encuentre.",
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
  back: "Volver al mapa",
} as const;

/**
 * Per-barrio status: evacuation and utilities.
 *
 * Badges only render for `normal` and `suspended` — `unknown` never earns a
 * chip, because "sin dato" repeated across every utility is noise, not a
 * finding. The banner leads with evacuation because a family decides on that
 * before anything else.
 */
export const NEIGHBORHOOD_STATUS_LABEL = {
  title: "Barrios con novedades",
  empty: "Sin barrios con novedades registradas por ahora.",
  evacuated: "Evacuado",
  gas: "Gas",
  power: "Energía",
  water: "Agua",
  normal: "Normal",
  suspended: "Suspendido",
  bannerEvacuated: "Este barrio tiene evacuación oficial.",
  bannerUtility: "Servicios afectados en este barrio.",
} as const;

/**
 * The animal board.
 *
 * "Visto en" rather than "está en", everywhere. The distinction is the whole
 * point of this board: nobody knows where a lost animal is, and wording that
 * implies otherwise sends people to the wrong block.
 */
export const ANIMAL_LABEL = {
  lost: "Se perdió",
  found: "Lo encontraron",
  sighted: "Lo vieron",
  dog: "Perro",
  cat: "Gato",
  other: "Otro",
  resolved: "Ya está en casa",
  markResolved: "Ya apareció",
  seenAt: "Visto",
  contact: "Escribir por WhatsApp",
  noPhoto: "Sin foto",
  empty: "Todavía no hay reportes de animales.",
} as const;

/** The animal report form. */
export const ANIMAL_FORM = {
  title: "Reportar un animal",
  subtitle:
    "Sale al tablero de una vez. La foto es lo que de verdad hace que alguien lo reconozca.",
  kind: "¿Qué pasó?",
  species: "¿Qué animal es?",
  photo: "Foto",
  photoHint: "Se reduce en tu teléfono antes de subirla, para que no gaste datos.",
  photoPick: "Elegir foto",
  photoChange: "Cambiar foto",
  petName: "Nombre (si lo sabes)",
  petNamePlaceholder: "Lolia, Abba…",
  description: "¿Cómo se reconoce?",
  descriptionPlaceholder:
    "Perro criollo café, collar azul, mediano, cojea de una pata.",
  when: "¿Cuándo fue?",
  zone: "¿En qué barrio?",
  where: "Marca en el mapa dónde lo viste (opcional)",
  whereHint:
    "Es dónde lo VIERON, no dónde está. Se dibuja punteado para que nadie lo confunda.",
  whatsapp: "Tu WhatsApp",
  whatsappHint: "Obligatorio: es como te avisan si lo encuentran.",
  submit: "Publicar en el tablero",
  submitting: "Publicando…",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/** Badge styling per kind. Found and sighted are good news and read as such;
 *  lost is the one that needs eyes on it. */
export const ANIMAL_KIND_STYLE = {
  lost: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  found: "bg-resolved-surface text-resolved border-resolved/30",
  sighted: "bg-claimed-surface text-claimed border-claimed/30",
} as const;

/**
 * Grupos — cuadrillas, brigadas, turnos que alguien arma para ir a ayudar.
 *
 * "Grupo" and not "jornada" or "convocatoria" everywhere the reader can see.
 * The code says `volunteer_call` because that is what the row is (and
 * `conveneCall`, `CallDAL` keep that name too — renaming the schema and every
 * identifier for a copy change would be a much bigger, riskier edit for zero
 * user-facing gain); the city says "armemos un grupo pa' sacar escombros",
 * and matching the word people already use in a WhatsApp thread is what gets
 * someone to actually create one instead of just reading the map.
 */
export const CALL_CATEGORY_LABEL: Record<CallCategory, string> = {
  debris_removal: "Escombros",
  logistics: "Logística",
  census: "Censo",
  animals: "Animales",
  health: "Salud",
  structural_survey: "Estructuras",
  other: "Otra",
};

/** The icon carries the kind of work, exactly as it carries the kind of place
 *  on a site pin. The shovel is the one that has to be unmistakable: removing
 *  debris is most of what gets convened. */
export const CALL_CATEGORY_ICON: Record<CallCategory, LucideIcon> = {
  debris_removal: Shovel,
  logistics: Boxes,
  census: ClipboardList,
  animals: PawPrint,
  health: HeartPulse,
  structural_survey: HardHat,
  other: Users,
};

/**
 * What a call is doing right now, which is the only question a reader has
 * about one.
 *
 * This used to borrow a site's status colours outright, so the map would
 * teach one grammar instead of two. It taught one grammar and lost one
 * distinction: at map scale colour resolves several hundred milliseconds
 * before shape does, so a grupo en curso and an acopio abierto were the same
 * green dot until you looked twice. A grupo now carries its own hue
 * (`--group`) and states its state by weight instead — solid en curso,
 * softened próxima, grey once it is over. The status axis stays untouched
 * for the families that are actually on it.
 */
export type CallState = "live" | "upcoming" | "ended";

export function callState(
  call: Pick<CallDTO, "startsAt" | "expiresAt">,
  now: number = Date.now(),
): CallState {
  if (now >= Date.parse(call.expiresAt)) return "ended";
  return now >= Date.parse(call.startsAt) ? "live" : "upcoming";
}

export const CALL_STATE_LABEL: Record<CallState, string> = {
  live: "En curso",
  upcoming: "Próxima",
  ended: "Ya terminó",
};

export const CALL_STATE_MARKER: Record<CallState, string> = {
  live: "bg-group text-group-foreground",
  // Softened rather than recoloured: the hue is the identity and must not
  // move between states, so weight is the only axis left to carry them.
  upcoming: "bg-group/70 text-group-foreground",
  ended: "bg-stale text-background",
};

export const CALL_STATE_STYLE: Record<CallState, string> = {
  live: "bg-group-surface text-group border-group/30",
  upcoming: "bg-group-surface/70 text-group border-group/20",
  ended: "bg-stale-surface text-stale border-stale/30",
};


/** The grupos block at the top of "Ayudar", and the card on the map. */
export const CALL_LABEL = {
  heading: "Grupos",
  headingHint: "Dónde hay gente trabajando ahora mismo",
  empty:
    "Todavía no hay grupos reportados. Si viste uno, o estás en uno, publícalo y la ciudad lo ve hoy mismo.",
  meetingPoint: "Punto de encuentro",
  organiser: "Escribir a quien reportó",
  directions: "Cómo llegar",
  share: "Compartir",
  ended: "Este grupo ya terminó.",
  endedHint: "Mira los que están abiertos ahora en el mapa.",
  backToMap: "Ver el mapa",
  countOne: "1 grupo",
  countMany: (n: number) => `${n} grupos`,
} as const;

/** Moving a pin. See `RelocateCall` and `CallDAL.relocate`. */
export const RELOCATE_LABEL = {
  open: "Ajustar el punto",
  title: "¿Dónde exactamente?",
  hint: "Solo se puede mover dentro del mismo barrio. Si el punto queda fuera, no se guarda.",
  save: "Guardar",
  saving: "Guardando…",
  cancel: "Cancelar",
  done: "Punto actualizado",
  failed: "No se pudo mover el punto. Intenta otra vez.",
} as const;

/**
 * The form that reports a grupo.
 *
 * It used to be two: a scheduled shift with an hour, a roster and a cap, and
 * a bare pin for "alguien se está juntando ahí". Ten of the first thirteen
 * grupos took the second path and one person in total ever signed up, so the
 * scheduled half is gone and this copy asks only what somebody walking past
 * can actually answer.
 */
export const CALL_FORM = {
  title: "Reportar un grupo",
  subtitle:
    "Sale al mapa de una vez, sin cuenta. Gente que ya está trabajando, o que se está juntando ahora.",
  category: "¿Qué están haciendo?",
  description: "¿Qué está pasando ahí?",
  descriptionPlaceholder: "Un grupo de vecinos recogiendo escombros en la cuadra.",
  barrio: "¿En qué barrio?",
  where: "Ajusta el punto",
  whereHint:
    "El mapa ya está en el barrio. Arrastra unos metros hasta la esquina exacta.",
  whereLocked: "Elige el barrio y el mapa se abre ahí.",
  barrioRequired:
    "Elige primero el barrio. Sin eso el punto queda en el centro de la ciudad.",
  meetingAddress: "¿Dónde exactamente?",
  meetingAddressPlaceholder: "Frente a la tienda, portería del conjunto…",
  meetingAddressHint: "Opcional. Si sabes la esquina, ayuda a quien va llegando.",
  whatsapp: "Tu WhatsApp",
  whatsappHint:
    "Opcional, y visible para todos: es para que te pregunten si el grupo sigue ahí.",
  submit: "Publicar el grupo",
  submitting: "Publicando…",
  hint: "Sale del mapa solo, al terminar el día.",
  nearbyTitle: "Ya hay un grupo parecido",
  nearbyBody:
    "Está muy cerca y se reportó hace poco. Si es el mismo, no lo publiques dos veces.",
  nearbyIgnore: "No es el mismo, publicar igual",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/**
 * The services section, which has no entity behind it yet.
 *
 * It is shown empty rather than hidden because the four sections are the shape
 * of the product, and a navigation that changes shape between visits teaches
 * nobody anything. The copy says what will be here and what to do meanwhile —
 * it does not offer a form that would drop what someone typed.
 */
export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  dump_truck: "Volqueta",
  pickup: "Carro",
  tools: "Herramienta",
  warehouse: "Bodega",
  free_transport: "Transporte",
  machinery: "Maquinaria",
  home_stay: "Hogar de paso",
  other: "Otro",
};

export const RESOURCE_TYPE_ICON: Record<ResourceType, LucideIcon> = {
  dump_truck: Truck,
  pickup: Car,
  tools: Wrench,
  warehouse: Warehouse,
  free_transport: Car,
  machinery: Construction,
  home_stay: Home,
  other: Package,
};

export const SERVICES_LABEL = {
  title: "Servicios",
  headingHint: "Lo que la gente ya tiene y presta: volqueta, herramienta, un cuarto libre.",
  empty:
    "Todavía no hay servicios publicados. Si tienes con qué ayudar, sé el primero.",
  countOne: "1 servicio",
  countMany: (n: number) => `${n} servicios`,
  contact: "Escribir por WhatsApp",
  /** The card on the map says whether the offer is anchored anywhere at all.
   *  Most are not: "tengo una volqueta" is a barrio, not a corner. */
  cityWide: "Toda la ciudad",
  availableNow: "Disponible ahora",
} as const;

export const SERVICES_FORM = {
  title: "Ofrecer un servicio",
  subtitle:
    "Sale al mapa de una vez, sin cuenta. Publica solo lo que ya tienes, no una promesa.",
  type: "¿Qué ofreces?",
  description: "Cuéntalo en pocas palabras",
  descriptionPlaceholder:
    "Volqueta doble troque, disponible fines de semana. Tengo dos.",
  barrio: "¿Desde qué barrio?",
  wholeCity: "Toda la ciudad",
  whatsapp: "Tu WhatsApp",
  whatsappHint: "Para que te escriban directamente. Queda visible para todos.",
  hint: "El servicio sigue visible una semana.",
  submit: "Publicar el servicio",
  submitting: "Publicando…",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/**
 * What each section says when it holds nothing yet.
 *
 * Never "no hay resultados": that reads as a broken app during an emergency,
 * and it is also false. It says who fills this section and how, so an empty
 * screen is an invitation instead of a dead end.
 */
export const SECTION_EMPTY: Record<
  Extract<PanelChip, "all" | "sites" | "pets" | "services">,
  string
> = {
  all: "Todavía no hay nada reportado en la ciudad. Sé la primera persona en publicar algo.",
  sites: "Todavía no hay puntos publicados en el mapa: acopios, albergues, salud, censo o sangre.",
  pets: ANIMAL_LABEL.empty,
  services: SERVICES_LABEL.empty,
};

/**
 * Picking the barrio in a report form.
 *
 * The wording never promises that this is where the point will be recorded —
 * it says what it does, which is open the map there. What lands in the database
 * is still decided by where the pin ends up, and copy that implied otherwise
 * would be a promise the app does not keep.
 */
export const BARRIO_PICKER = {
  locate: "El barrio donde estoy",
  locating: "Buscando…",
  locateDenied:
    "No pudimos usar tu ubicación. Busca el barrio en la lista de abajo.",
  locateFailed: "Tu teléfono no dio la ubicación. Búscalo en la lista.",
  search: "Buscar el barrio",
  empty: "Ningún barrio se llama así. Revisa cómo se escribe, o busca el de al lado.",
  change: "Cambiar",
  municipality: {
    manizales: "Manizales",
    villamaria: "Villamaría",
  },
} as const;

/**
 * The barrio outlines. The one context layer left after the move to sections:
 * it answers "¿en qué barrio estoy?" at the same time as whatever else is on
 * screen, which is why it is a toggle and not a section of its own.
 *
 * The hint names the source. During an emergency people compare what they see
 * against what they know, and "official" is the word that settles an argument
 * about where a border runs.
 */
/**
 * Panel-wide labels. `UnifiedPanel` reads these plus whatever each family's
 * own module already exports (`CALL_LABEL.heading`, `SERVICES_LABEL.title`,
 * and so on) instead of duplicating a title here.
 */
/**
 * What a shared link says about itself — the card in a WhatsApp thread, the
 * search result, the browser tab. Here rather than inline in each route for
 * the reason every other string is: two screens drifting apart is how a
 * product starts describing itself two different ways.
 */
export const OG_LABEL = {
  siteName: "Manizales de Pie",
  tagline: "Mapa de ayuda · Manizales y Villamaría",
  /** The eyebrow over each card — the kind of thing behind the link. */
  site: "Punto",
  call: "Grupo",
  workOrder: "Necesidad",
  animal: "Animal",
  resourceOffer: "Servicio",
  /** The home card: no one entity, so it states what the map is for. */
  homeTitle: "¿Dónde ayudo hoy?",
  homeMeta:
    "Acopios, albergues, donación de sangre, grupos y necesidades, en un solo mapa.",
  /** The home card counts what is on the map instead of describing it. A
   *  live map is proved by numbers; "en un solo mapa" is a claim, and after
   *  a disaster there are plenty of abandoned sites making it. */
  homeCounts: (sites: number, calls: number, orders: number) =>
    [
      sites === 1 ? "1 punto" : `${sites} puntos`,
      calls === 1 ? "1 grupo abierto" : `${calls} grupos abiertos`,
      orders === 1 ? "1 necesidad" : `${orders} necesidades`,
    ].join(" · "),
  /** The one line telling somebody who has never opened this that the image
   *  in their chat is a link to something. */
  cta: "Abrir en el mapa →",
  notFound: "No encontrado",
} as const;

export const PANEL_LABEL = {
  all: "Todo",
  sites: "Sitios",
  pets: "Mascotas",
  collapse: "Minimizar panel",
  expand: "Mostrar panel",
  /** Everything the panel is currently listing, across families — shown in
   *  the header so a collapsed panel still says how much is behind it. */
  itemsOne: "1 punto",
  itemsMany: (n: number) => `${n} puntos`,
  /** Deliberately quiet, in the panel's bottom edge: someone who needs to
   *  report a mistake in the data has to be able to find a human, and
   *  anyone else should never notice it is there. */
  contactPrompt: "Contacto:",
  contactEmail: "hi@felipego.com",
  /** "Todo" shows only the two most urgent of each family; this opens that
   *  family's own chip, where the rest live. The count is what makes it
   *  worth tapping — "ver 9 más" says how much is behind it. */
  seeMore: (n: number) => `Ver ${n} más`,
} as const;

/**
 * A barrio's declared priority. `NEED_PRIORITY_STYLE` deliberately reuses the
 * same colours as a work order's status badge — `critical` reads as
 * `unclaimed` red, `high` as `claimed` amber — so a reader who already learned
 * that grammar from a case card does not have to learn a second one for a
 * frente.
 */
export const NEED_PRIORITY_LABEL: Record<NeedPriority, string> = {
  critical: "Crítico",
  high: "Prioritario",
  normal: "Normal",
};

export const NEED_PRIORITY_STYLE: Record<NeedPriority, string> = {
  critical: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  high: "bg-claimed-surface text-claimed border-claimed/30",
  normal: "bg-muted text-muted-foreground border-transparent",
};

/**
 * Frentes: "este barrio necesita X", declared by the curator team so armar un
 * grupo starts from a problem already on record. See `neighborhood_need`.
 */
export const FRONTS_LABEL = {
  heading: "Frentes",
  headingHint: "Lo que cada barrio necesita, con los grupos que ya están en eso",
  empty: "Todavía no hay frentes declarados.",
  cases: (n: number) => (n === 1 ? "1 caso" : `${n} casos`),
  casesNone: "sin casos reportados",
  groupsCount: (n: number) => (n === 1 ? "1 grupo" : `${n} grupos`),
  groupsNone: "sin grupos todavía",
  filterBarrio: "Ver este barrio",
  armHere: "Armar un grupo aquí",
} as const;

/**
 * The header the panel grows when a barrio is being filtered by.
 *
 * "En este barrio" and not "resultados": the reader tapped a place on a map,
 * and the answer belongs to the place, not to a query. The empty line names
 * what is missing rather than saying zero, because during an emergency an empty
 * barrio usually means nobody has reported it yet — not that nothing is needed
 * there, which is the reading that would send help elsewhere.
 */
export const BARRIO_PANEL = {
  comuna: (id: string) => `Comuna ${Number(id)}`,
  /** Shown instead of a barrio name when nothing is filtered — the header is
   *  always on screen now (see BarrioHeader), so it always has something to
   *  say about where the panel is looking. */
  wholeCity: "Toda la ciudad",
  countOne: "1 punto en este barrio",
  countMany: (n: number) => `${n} puntos en este barrio`,
  empty: "Nadie ha reportado nada en este barrio todavía. Que esté vacío no quiere decir que no haga falta ayuda.",
  clear: "Ver toda la ciudad",
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

/**
 * Órdenes de trabajo. "Grupo" is a cuadrilla with a time and a place; this is
 * closer to "reporté los escombros de la 24" — a single job, not an event.
 */
export const WORK_ORDER_CATEGORY_LABEL: Record<WorkOrderCategory, string> = {
  debris_removal: "Escombros",
  animal_rescue: "Rescate de animales",
  structural_risk: "Riesgo estructural",
  // Covers food, drinking water, hygiene items — anything a family is
  // asking for rather than a job site is asking to be fixed. "Agua" used to
  // be its own category here and never once meant just water in practice;
  // see the note on `WORK_ORDER_CATEGORIES`.
  supplies: "Insumos",
  other: "Otro",
};

export const WORK_ORDER_CATEGORY_ICON: Record<WorkOrderCategory, LucideIcon> = {
  debris_removal: Shovel,
  animal_rescue: PawPrint,
  structural_risk: HardHat,
  supplies: Package,
  other: Boxes,
};

/**
 * Five states in the database, three on screen. The public reader's only
 * question is "¿alguien ya está en esto?" — closed_completed,
 * closed_by_others and closed_rejected all answer "no, and it does not need
 * you either", so they read the same. The detail behind each one is still
 * in the database for whoever claimed it; it was never hidden, just not
 * asked of a stranger scanning the map.
 */
export type WorkOrderRollup =
  | "unclaimed"
  | "claimed"
  | "attended"
  | "closed";

export function workOrderRollup(status: WorkOrderStatus): WorkOrderRollup {
  if (status === "unclaimed") return "unclaimed";
  if (status === "claimed") return "claimed";
  if (status === "attended") return "attended";
  return "closed";
}

export const WORK_ORDER_ROLLUP_LABEL: Record<WorkOrderRollup, string> = {
  unclaimed: "Necesita atención",
  claimed: "En proceso",
  // Says both halves on purpose. The word people reach for here is
  // "atendido", and alone it reads as finished — which is exactly the
  // mistake the old one-tap close institutionalised.
  attended: "Atendido, sigue abierto",
  closed: "Cerrado",
};

/** Same grammar as a site's marker: red asks for eyes on it, amber says
 *  someone is already moving, grey says there is nothing left to do here —
 *  matching `stale`, not `resolved`, because "closed_rejected" is not a
 *  success worth the green. */
export const WORK_ORDER_ROLLUP_MARKER: Record<WorkOrderRollup, string> = {
  unclaimed: "bg-unclaimed text-unclaimed-foreground",
  claimed: "bg-claimed text-claimed-foreground",
  // Green, because somebody did turn up and that is worth seeing from across
  // the map. Still a live pin, not a grey one: the case is open.
  attended: "bg-resolved text-resolved-foreground",
  closed: "bg-stale text-background",
};

export const WORK_ORDER_ROLLUP_STYLE: Record<WorkOrderRollup, string> = {
  unclaimed: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  claimed: "bg-claimed-surface text-claimed border-claimed/30",
  attended: "bg-resolved-surface text-resolved border-resolved/30",
  closed: "bg-stale-surface text-stale border-stale/30",
};

export const WORK_ORDER_LABEL = {
  // "Necesidades", not "Escombros": the category set behind a work order
  // grew past debris the day this started importing individual household
  // requests (water, animals, reconstruction materials, transport) — see
  // `work_order_category`. Short because this is a filter chip sharing a
  // row with several others, not a section header with the panel to itself.
  heading: "Necesidades",
  headingHint: "Casos puntuales que alguien con volqueta o manos puede atender",
  empty:
    "Todavía no hay necesidades puntuales reportadas. Si conoces una, repórtala desde Reportar.",
  countOne: "1 caso",
  countMany: (n: number) => `${n} casos`,
  // "Yo puedo atender" replaced "Reclamar" the 15th, along with the account
  // it used to require: no login, just a name and a WhatsApp, the same
  // shape `JOIN_LABEL` already uses for a grupo.
  attend: "Yo puedo atender",
  attending: "Enviando…",
  attendName: "Tu nombre (opcional)",
  attendPhone: "Tu WhatsApp (opcional)",
  anonymous: "Anónimo",
  attendSubmit: "Confirmar",
  attendCancel: "Ahora no",
  attendedThanks: "Listo, quedaste registrado.",
  /**
   * The contact block, shown to everyone since the 15th of August.
   *
   * It used to appear once, only to whoever had just typed a name and a
   * phone into "Yo puedo atender", and the hint said "anótala" because
   * there was no second chance. The gate is gone: it never verified
   * anybody, and someone with a volqueta could not call without first
   * committing to a case they had no way to size up.
   */
  contactTitle: "Dirección y contacto",
  contactCall: "Llamar",
  contactWhatsapp: "Escribir por WhatsApp",
  noContact:
    "Quien reportó esto no dejó dirección ni contacto. Guíate por el barrio y el punto en el mapa.",
  /** Said where the fields are typed, not here — see WORK_ORDER_FORM. This
   *  is the reader's side of the same fact. */
  contactPublicNote: "Estos datos los dejó quien reportó el caso.",
  attendNote: "¿Qué pasó o qué vas a hacer?",
  attendNoteRequired: "Cuenta qué pasó, en pocas palabras.",
  attendNotePlaceholder: "Voy mañana a las 8 con volqueta. Falta quien ayude a cargar.",
  attendeesHide: "Ocultar",
  attendeesLoading: "Cargando…",
  attendeesEmpty: "Nadie ha escrito nada todavía.",
  attendeeCountOne: "1 persona va a atenderlo",
  attendeeCountMany: (n: number) => `${n} personas van a atenderlo`,
  attendeeCountNone: "Nadie ha dicho que puede atenderlo todavía",
  helpedCountOne: "1 persona ya ayudó",
  helpedCountMany: (n: number) => `${n} personas ya ayudaron`,
  /**
   * Said under the entry buttons, once, in plain words.
   *
   * People need to know that saying "ya ayudé" is safe — that it records
   * what they did instead of switching the case off for everybody else.
   * Without this line the honest thing to do looks like the destructive one,
   * and the whole design depends on people using it.
   *
   * Two short sentences, not the four-line paragraph it started as: at
   * 0.65rem in a 20rem popup that was a grey wall nobody reads, which is the
   * same as not saying it.
   */
  updateHint:
    "Un caso se cierra solo cuando dos personas distintas dicen que ya ayudaron. Cualquiera puede reabrirlo.",
  /**
   * The section headings.
   *
   * The card had nine controls stacked at the same weight — atender,
   * ayudé, sigue haciendo falta, no es real, llegar, compartir, editar y dos
   * de cierre — so the eye had to read every label to find the one thing it
   * came for. These split them by the question each answers, which is also
   * how they differ in consequence: helping, going, fixing the listing,
   * curating.
   */
  sectionHelp: "¿Puedes ayudar?",
  sectionBeenThere: "¿Ya fuiste, o pasaste por ahí?",
  sectionWrong: "¿Algo está mal en este caso?",
  sectionCuration: "Curaduría",
  threadCount: (n: number) => `Ver qué ha pasado (${n})`,
  edit: "Editar",
  editCategory: "Categoría",
  editDescription: "Descripción",
  editSave: "Guardar",
  editSaving: "Guardando…",
  editCancel: "Cancelar",
  // Cerrar a mano es de curadores — ver `canCloseWorkOrder`. El camino
  // normal es el umbral que calcula la base.
  closeCompleted: "Cerrar como resuelto",
  closeRejected: "Marcar como no real",
  closeConfirm: "¿Seguro?",
  closeConfirmYes: "Sí",
  closeConfirmCancel: "No",
  closed: "Cerrado",
  share: "Compartir",
  shareCopied: "Enlace copiado",
  failed: "No se pudo completar. Intenta otra vez.",
} as const;

/**
 * The four things somebody can say about a case.
 *
 * Written as first-person statements of fact, not as commands that change
 * something: "Ya ayudé" reports what the person did, where "Ya se resolvió"
 * — the old label — asked them to rule on the case on everyone's behalf.
 * That difference in grammar is the whole redesign in two words.
 */
export const WORK_ORDER_UPDATE_KIND_LABEL: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "Yo puedo atender",
  helped: "Ya ayudé",
  still_needed: "Sigue haciendo falta",
  not_real: "Esto no es un caso real",
};

/** What the thread prints beside each entry — shorter, because the name and
 *  the note are the line's content and this is only its kind. */
export const WORK_ORDER_UPDATE_KIND_TAG: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "Va a atenderlo",
  helped: "Ya ayudó",
  still_needed: "Sigue haciendo falta",
  not_real: "Dice que no es real",
};

export const WORK_ORDER_UPDATE_KIND_STYLE: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "bg-claimed-surface text-claimed border-claimed/30",
  helped: "bg-resolved-surface text-resolved border-resolved/30",
  still_needed: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  not_real: "bg-stale-surface text-stale border-stale/30",
};

/** What each entry asks for in its own words, so one composer can serve all
 *  four without the placeholder ever being generic. */
export const WORK_ORDER_UPDATE_PLACEHOLDER: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "Voy mañana a las 8 con volqueta. Falta quien ayude a cargar.",
  helped: "Saqué dos volquetadas. Falta despejar el andén.",
  still_needed: "Pasé hoy y sigue igual, no ha ido nadie.",
  not_real: "Es la misma casa que ya está reportada más arriba.",
};

export const WORK_ORDER_FORM = {
  // The menu entry, the route segment and this title used to be three
  // different names for one action ("Pedir ayuda" → /reportar/escombros →
  // "Reportar escombros o un daño"). They are one word now, and it is the
  // panel's own: the "Necesidades" chip is where these rows are read.
  // "Reportar" and not "Pedir" because most of these are typed by a neighbour
  // on behalf of the affected household, not by the household itself.
  title: "Reportar una necesidad",
  subtitle:
    "Sale al mapa de una vez, sin cuenta. Alguien con volqueta o manos puede decir que lo atiende.",
  category: "¿Qué tipo de caso es?",
  description: "Describe el caso",
  descriptionPlaceholder:
    "Escombros bloqueando la entrada de dos casas, se necesita volqueta.",
  barrio: "¿En qué barrio?",
  contactTitle: "¿Dónde exactamente y cómo contactar?",
  /**
   * The warning has to be here, where the fields are, and it has to be
   * blunt. Nothing downstream can undo what someone types into a public
   * field — not the DAL, not a curator — so this line is the only real
   * protection left for a person whose neighbour is filling this in on
   * their behalf. It says "si no es tu casa, pregunta" for that reason.
   */
  contactHint:
    "Público: cualquiera que abra el caso lo ve, y es lo que permite que te llamen. Si estás reportando la casa de otra persona, pregúntale antes de poner su dirección o su teléfono.",
  exactAddress: "Dirección exacta",
  contactName: "Nombre de contacto",
  phone: "Teléfono",
  notes: "Notas para quien lo atienda",
  submit: "Publicar el caso",
  submitting: "Publicando…",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/**
 * The curator-only strip that appears on every card — site, grupo, necesidad,
 * mascota, servicio — once `isAdmin` is true (see `WorkspaceContext`). One
 * shared vocabulary for editing, hiding and deleting, so a curator learns the
 * controls once instead of once per entity.
 *
 * Hide is the default destructive action, and it is reversible — flips
 * `published` back off, same column every list already filters by, so the
 * row simply stops appearing rather than losing history. Delete is separate
 * and asks twice on purpose: it is a real `DELETE FROM`, for spam and test
 * rows, not for something that just went stale.
 */
export const ADMIN_LABEL = {
  edit: "Editar",
  save: "Guardar",
  saving: "Guardando…",
  cancel: "Cancelar",
  hide: "Ocultar",
  hiding: "Ocultando…",
  /** The state a row is IN, shown as a badge — distinct from `hide`/
   *  `publish`, which are the actions that change it. */
  hidden: "Oculto",
  visible: "Visible",
  publish: "Publicar",
  publishing: "Publicando…",
  delete: "Eliminar",
  deleteConfirm: "¿Seguro? Se borra para siempre",
  deleteConfirmShort: "Sí, borrar",
  deleting: "Borrando…",
  failed: "No se pudo completar. Intenta otra vez.",
  /** Field placeholders shared by every entity's inline edit form — one
   *  vocabulary instead of each card inventing its own. */
  fieldName: "Nombre",
  fieldDescription: "Descripción",
  fieldAddress: "Dirección",
  fieldSchedule: "Horario",
  fieldWhatsapp: "WhatsApp",
  fieldZone: "Barrio o zona",
} as const;
