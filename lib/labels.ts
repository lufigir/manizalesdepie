import {
  Boxes,
  Car,
  CircleCheck,
  ClipboardList,
  Construction,
  Cross,
  Flag,
  GlassWater,
  Droplet,
  HandHelping,
  HardHat,
  Home,
  Package,
  PawPrint,
  RotateCcw,
  Shovel,
  Tent,
  Truck,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { NeedPriority } from "@/data/neighborhood/neighborhood.dto";
import type { ResourceType } from "@/data/resource_offer/resource_offer.dto";
import type { ItemMode, SiteStatus, SiteType } from "@/data/site/site.dto";
import type {
  WorkOrderCategory,
  WorkOrderDTO,
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
  /** The bubble top-left of the map when nobody is signed in. "Entrar" and
   *  nothing else: what the account is FOR is said on the login screen. */
  enter: "Entrar",
  /** Screen-reader name for the bubble itself, since the visible text changes
   *  with the session. */
  menuLabel: "Tu cuenta",
  /** How a role reads to the person holding it, on the account bubble. The
   *  role drives what they can DO (curator actions), so it is named rather
   *  than left as the machine word. */
  roles: {
    visitor: "Visitante",
    contributor: "Colaborador",
    curator: "Curador",
  } as const,
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
  whatsapp: "Escribirle",
  share: "Compartir",
  copied: "Enlace copiado",
  /** Short on purpose: on a phone the long version ("¿Estás ahí ahora? Dinos
   *  cómo lo encontraste:") wrapped onto a second line above three buttons
   *  that already say what they do. */
  confirmPrompt: "¿Estás ahí? Confirma cómo está:",
  description: "Descripción",
  /** Heads the type chips inside the edit form. The field is new there — the
   *  old curator-only form corrected every text field and left the one that
   *  decides which icon the map draws. */
  editType: "¿Qué es este lugar?",
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
  /**
   * A sighting is seen, not confirmed — and `last_seen_at` is literally when
   * somebody saw the animal, so "Publicado" would be as wrong here as
   * "Confirmado" was.
   *
   * Callers used to pass the default verb and then strip it back off with
   * `freshLabel.replace(/^Confirmado /, "")`, which only ever matched the
   * under-24h branch: anything older came out as "Visto Sin confirmar hace 3
   * días". Naming the verb here is what removes both the stripping and the
   * sentence it produced.
   */
  fresh: { recent: "Visto", stale: "Visto" },
  contact: "Escribirle",
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
  photoPick: "Elegir foto",
  photoChange: "Cambiar foto",
  petName: "Nombre (si lo sabes)",
  petNamePlaceholder: "Lolia, Abba…",
  description: "¿Cómo se reconoce?",
  descriptionPlaceholder:
    "Perro criollo café, collar azul, mediano, cojea de una pata.",
  when: "¿Cuándo fue?",
  zone: "¿En qué barrio?",
  whereHint:
    "Es dónde lo VIERON, no dónde está. Si no marcas un punto, usamos el centro del barrio.",
  whatsapp: "Tu WhatsApp",
  submit: "Publicar en el tablero",
  submitting: "Publicando…",
  failed: "No se pudo publicar. Revisa los datos e intenta otra vez.",
} as const;

/** Map pin fill — the same hue as albergue sitios (`layer-shelter`), with a
 *  paw so a pet reads at a glance before the icon resolves. */
export const ANIMAL_MARKER = "bg-layer-shelter text-background";

/** Badge styling per kind. Found and sighted are good news and read as such;
 *  lost is the one that needs eyes on it. */
export const ANIMAL_KIND_STYLE = {
  lost: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  found: "bg-resolved-surface text-resolved border-resolved/30",
  sighted: "bg-claimed-surface text-claimed border-claimed/30",
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
  contactTitle: "Contacto",
  contact: "Escribirle",
  /** A service is published, not confirmed: its `confirmed_count` is gone, so
   *  `confirmed_at` is when it went up, not when somebody vouched for it. */
  fresh: { recent: "Publicado", stale: "Publicado" },
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
 * own module already exports (`WORK_ORDER_LABEL.heading`,
 * `SERVICES_LABEL.title`, and so on) instead of duplicating a title here.
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
  workOrder: "Necesidad",
  animal: "Animal",
  resourceOffer: "Servicio",
  /** The home card: no one entity, so it states what the map is for. */
  homeTitle: "¿Dónde ayudo hoy?",
  homeMeta:
    "Necesidades, acopios, albergues y donación de sangre, en un solo mapa.",
  /** The home card counts what is on the map instead of describing it. A
   *  live map is proved by numbers; "en un solo mapa" is a claim, and after
   *  a disaster there are plenty of abandoned sites making it. */
  homeCounts: (sites: number, orders: number) =>
    [
      sites === 1 ? "1 punto" : `${sites} puntos`,
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
  contactButton: "Reportar error o contactar",
  contactEmail: "luisgir827@gmail.com",
  madeIn: "Hecho en Manizales ❤️",
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

/**
 * The city's attendance, in three numbers, over the map.
 *
 * It took the corner a barrio-name chip used to hold. That chip named the
 * barrio under the cursor — a fact the map itself already draws, and one
 * nobody was reading — while the question this product exists to answer went
 * unanswered anywhere on screen: how much of what has been reported still has
 * nobody on it.
 *
 * The wording is people, never percentages of a job nobody measured, and the
 * middle column is deliberately not called "atendido": a case somebody helped
 * once is still open, and collapsing that into "done" is the exact misreading
 * `WORK_ORDER_ROLLUP_LABEL` was written to prevent. So the third column says
 * "ya ayudaron" — a true statement about people — rather than "resueltos",
 * which would be false for most of what it counts.
 */
export const ATTENDANCE_LABEL = {
  /** What the three numbers are counting. Kept for the screen-reader
   *  sentence and the tooltip; the visible header is now the shut state's
   *  own reading ("22 sin atender"), which says the subject by saying the
   *  thing. */
  heading: "Necesidades",
  /** Names the header button for a screen reader, which cannot infer from a
   *  chevron that there are two more rows behind it. */
  toggle: "Ver el detalle de las necesidades",
  /**
   * The three read as one sentence — "22 sin atender · 0 en camino · 0 ya
   * ayudaron" — so they are written as sentence fragments, not as column
   * headers.
   *
   * They were "sin ir" / "van" / "ya ayudaron" under three stacked columns
   * for exactly one revision. Stacked under a number, at the size that
   * corner can afford, each fragment had to be read on its own and the
   * clipped ones ("van") read as nothing at all.
   */
  /** Nobody has been. `untouched` plus `reopened`: somebody went, it was not
   *  enough, and the case is asking for the same thing again. */
  waiting: "sin atender",
  /** Somebody said "voy" and has not reported back. */
  onTheWay: "en camino",
  /** At least one person helped — whether or not the case then closed. */
  helped: "ya ayudaron",
  /** The screen-reader sentence, and the tooltip. The columns are three
   *  numbers with two-word labels; this is where the full reading lives. */
  summary: (waiting: number, onTheWay: number, helped: number) =>
    `${waiting} necesidades sin que nadie vaya, ${onTheWay} con alguien en camino, ${helped} donde ya ayudaron al menos una vez.`,
  /** Nothing reported here at all. Shown instead of three zeros, which read
   *  as "resuelto" rather than "sin datos". */
  empty: "Sin necesidades reportadas",
} as const;

/**
 * The write path's one button, bottom-left of the map.
 *
 * Its strings were hardcoded inside `ReportMenu` — the drift this module
 * exists to prevent, and the only Spanish left in a component.
 */
export const REPORT_MENU = {
  open: "Reportar",
  close: "Cerrar",
  openLabel: "Más formas de reportar",
  closeLabel: "Cerrar opciones de reportar",
  /** Sits above the four rows once the menu is open. The button says
   *  "Reportar"; this says what the list under it is answering. */
  heading: "¿Qué quieres reportar?",
} as const;

/**
 * Correcting a pin's position.
 *
 * Worded as a correction and never as an edit. Almost every coordinate on
 * this map is somebody's best guess — a form filled in on a street, or a
 * press report geocoded by approximation — so moving a pin is the normal
 * maintenance of the thing, not an administrative action, and the copy should
 * not make a neighbour feel they are overruling anybody.
 *
 * Nothing here mentions the barrio rule. Somebody moving a pin thirty metres
 * would have to read a restriction that will never apply to them; the one
 * person it does apply to is told at the moment they hit it, by the DAL, in a
 * sentence that also says what to do instead.
 */
export const RELOCATE_LABEL = {
  action: "Corregir ubicación",
  title: "¿Dónde queda exactamente?",
  hint: "Mueve el mapa hasta que el pin quede en el sitio.",
  barrioJump: "Ir a un barrio…",
  barrioChosen: (name: string) => `Mapa en ${name} · cambiar`,
  save: "Guardar aquí",
  saving: "Guardando…",
  cancel: "Cancelar",
  failed: "No se pudo mover el punto.",
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
 *
 * The verb is configurable because not every entity has confirmation: a
 * service offer lost its `confirmed_count` on 15 August, so its
 * `confirmed_at` is the moment it went up — "Publicado", not "Confirmado",
 * would claim a voucher nobody left. Default stays "Confirmado", which is
 * true for sites, work orders and animals.
 */
export function freshness(
  confirmedAt: string,
  verb: { recent: string; stale: string } = {
    recent: "Confirmado",
    stale: "Sin confirmar",
  },
): {
  label: string;
  stale: boolean;
} {
  const elapsedMs = Date.now() - new Date(confirmedAt).getTime();
  const hours = Math.floor(elapsedMs / 3_600_000);

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(elapsedMs / 60_000));
    return { label: `${verb.recent} ${relative.format(-minutes, "minute")}`, stale: false };
  }
  if (hours < 24) {
    return { label: `${verb.recent} ${relative.format(-hours, "hour")}`, stale: hours >= 12 };
  }

  const days = Math.floor(hours / 24);
  return { label: `${verb.stale} ${relative.format(-days, "day")}`, stale: true };
}

/**
 * Órdenes de trabajo — "necesidades" to everyone who reads this app, and the
 * spine of the whole product since the grupos were removed on 15 August.
 *
 * A case is "reporté los escombros de la 24": a single job at a single place,
 * true until somebody does it. Not an event with an hour, which is what a
 * grupo was and why it could not be kept honest on a map.
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
  /** Nobody has said anything about this case. The loudest thing on the map. */
  | "untouched"
  /** Somebody said "voy", and nobody has been yet. A promise, not a result. */
  | "onTheWay"
  /** One person helped. The case is NOT better than half-done — see below. */
  | "partial"
  /** Two or more people have helped, and it is still open. */
  | "advanced"
  /** Somebody stood there after the last help and said it is still not enough. */
  | "reopened"
  /** Closed by the book: two distinct, named phones said "ya ayudé". */
  | "done"
  /** Closed without being resolved — a curator's rejection, or already done by
   *  others. Off the map's to-do list, but not a success. */
  | "dismissed";

/**
 * What the pin says, read off the book of entries rather than off the status
 * alone.
 *
 * Two corrections over the four-state version this replaces, both of them
 * about the same mistake — treating one act of help as an ending.
 *
 * **Helping once does not finish a house.** A damaged home is worked on over
 * days, by different people, in shifts nobody coordinates centrally: somebody
 * clears the patio on Tuesday, somebody else the second floor on Saturday.
 * The old rollup painted a case green the moment one person reported helping,
 * and green is read across a map as "done, look elsewhere" — which is how a
 * case that still needs five more people stops receiving any. Help now moves
 * the pin through amber and only lightens as it accumulates; green is
 * reserved for a case that actually closed.
 *
 * **A contested case was the worst of it.** "Ya ayudé" then "sigue haciendo
 * falta" leaves `status` at `attended`, because people genuinely did turn up
 * — so the one case on the map most in need of hands was wearing the colour
 * that means handled. `reopened` is the second axis the database persists for
 * exactly this (migration `20260815070000_work_order_reopened`) and it
 * outranks every open state here.
 *
 * The intensity ramp within amber is the honest version of "how far along is
 * this": it is a count of people, not a percentage of a job nobody has
 * measured. It never reaches green on its own.
 */
export function workOrderRollup(
  order: Pick<WorkOrderDTO, "status" | "reopened" | "helpedCount">,
): WorkOrderRollup {
  if (order.status === "closed_completed") return "done";
  if (order.status === "closed_rejected" || order.status === "closed_by_others") {
    return "dismissed";
  }
  // Outranks the help that came before it: that is the whole point of the
  // entry somebody left.
  if (order.reopened) return "reopened";
  if (order.helpedCount >= 2) return "advanced";
  if (order.helpedCount >= 1) return "partial";
  if (order.status === "claimed") return "onTheWay";
  return "untouched";
}

export const WORK_ORDER_ROLLUP_LABEL: Record<WorkOrderRollup, string> = {
  untouched: "Nadie ha ido",
  onTheWay: "Alguien va en camino",
  // Both halves, always. "Atendido" alone is the exact reading this whole
  // scale exists to prevent.
  partial: "Ayudaron una vez, sigue abierto",
  advanced: "Varias ayudas, sigue abierto",
  // Somebody's own words, because their entry is the reason this says what it
  // says.
  reopened: "Sigue haciendo falta",
  done: "Resuelto",
  dismissed: "Cerrado",
};

/**
 * A ramp from red to green that a case walks along while staying open.
 *
 * Red asks for eyes on it. Amber says somebody has been. Green says this is
 * no longer where the city most needs a pair of hands — NOT that it is over.
 * Grey means off the list without being a success, which is why a rejection
 * lands on `stale` and not on `resolved`.
 *
 * Green used to mean closed, because a case closed itself on the second "ya
 * ayudé" and `done` was the only way to earn the hue. That rule is gone (see
 * the migration of 16 August): help arriving is not the same event as a
 * household no longer needing help, and reading it as one took pins off the
 * map over families who were still waiting. What survives is the reading the
 * ramp was always for — how much attention this has already had — now
 * carried all the way to the end of the scale.
 *
 * Full-strength green is still reserved for `done`, a curator's close, so
 * there is exactly one green a reader may take as final.
 *
 * Lightness is the intensity axis within each hue: lighter always means
 * "further along", never "less urgent". An untouched case and a reopened one
 * are both full-strength red, because they are asking for the same thing.
 */
export const WORK_ORDER_ROLLUP_MARKER: Record<WorkOrderRollup, string> = {
  untouched: "bg-unclaimed text-unclaimed-foreground",
  // Softened, not recoloured: somebody saying "voy" is a promise. Nothing has
  // happened at this house yet, so the pin must not stop being red.
  onTheWay: "bg-unclaimed/75 text-unclaimed-foreground",
  partial: "bg-claimed text-claimed-foreground",
  // Green, and still open. This is the change of 16 August: a case used to
  // close itself on the second "ya ayudé", so green could only ever mean
  // closed. It does not close now (see the migration of the same date), so
  // green carries what the ramp always meant by it — "this is no longer the
  // most urgent thing on the map" — for a case that is still listed, still
  // contactable, and still asking.
  advanced: "bg-resolved/75 text-resolved-foreground",
  reopened: "bg-unclaimed text-unclaimed-foreground",
  // Full-strength green is a curator's close, the one green a reader can
  // take as final.
  done: "bg-resolved text-resolved-foreground",
  dismissed: "bg-stale text-background",
};

export const WORK_ORDER_ROLLUP_STYLE: Record<WorkOrderRollup, string> = {
  untouched: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  onTheWay: "bg-unclaimed-surface/70 text-unclaimed border-unclaimed/20",
  partial: "bg-claimed-surface text-claimed border-claimed/30",
  advanced: "bg-resolved-surface/70 text-resolved border-resolved/20",
  reopened: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  done: "bg-resolved-surface text-resolved border-resolved/30",
  dismissed: "bg-stale-surface text-stale border-stale/30",
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
  /**
   * A case is published, not confirmed.
   *
   * "Confirmado hace 3 h" claimed somebody had gone back and vouched for the
   * case, and nothing in this family can produce that: a necesidad carries no
   * `confirmed_count`, and what people leave on it are thread entries (voy /
   * ya ayudé / sigue haciendo falta), which the rollup already reports in its
   * own words. `confirmed_at` here is the moment the case went up, so that is
   * what the label says. Sitios keep the confirming verb, because sitios
   * still have the one-tap confirmation behind it.
   */
  fresh: { recent: "Publicado", stale: "Publicado" },
  // "Yo puedo atender" replaced "Reclamar" the 15th, along with the account
  // it used to require: no login, just a name and a WhatsApp.
  attend: "Yo puedo atender",
  attending: "Enviando…",
  attendName: "Tu nombre (opcional)",
  attendPhone: "Tu WhatsApp (opcional)",
  anonymous: "Anónimo",
  attendSubmit: "Confirmar",
  attendCancel: "Ahora no",
  attendedThanks: "Listo, quedaste registrado.",
  /** The two tabs `WorkOrderActions` splits into. "Detalle" is everything
   *  that was competing with the thread for space on one long scroll —
   *  contact, botones, curaduría — and "Hilo" reuses `threadTitle`/
   *  `threadCount` below, so a case's history gets the panel to itself
   *  instead of sharing it with nine other controls. */
  tabDetail: "Detalle",
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
  contactWhatsapp: "Escribirle",
  noContact:
    "Quien reportó esto no dejó dirección ni contacto. Guíate por el barrio y el punto en el mapa.",
  /** Said where the fields are typed, not here — see WORK_ORDER_FORM. This
   *  is the reader's side of the same fact. */
  contactPublicNote: "Estos datos los dejó quien reportó el caso.",
  attendNote: "¿Qué pasó o qué vas a hacer?",
  attendNoteRequired: "Cuenta qué pasó, en pocas palabras.",
  attendNotePlaceholder: "Voy mañana a las 8 con volqueta. Falta quien ayude a cargar.",
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
   *
   * It used to say a case closes itself on the second "ya ayudé". It does
   * not any more (see the migration of 16 August) — a case stays on the map
   * and only changes colour — and this line is where that promise is made to
   * the person about to tap. Saying it plainly is what makes "ya ayudé" safe
   * to press: nothing disappears because of it.
   */
  updateHint:
    "El caso no se cierra: se pone verde y deja de verse urgente, pero sigue en el mapa. Si sigue haciendo falta, dilo y vuelve a rojo.",
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
  /**
   * The thread's own heading.
   *
   * It used to be the label on a ghost button that kept the thread shut
   * ("Ver qué ha pasado (3)"). The thread is the product — it is what makes
   * several people working on one house over several days add up to
   * something instead of three volquetas on the same corner at the same hour
   * — and hiding it behind a tap put the most valuable thing on the card
   * below the two least valuable.
   */
  threadTitle: "Qué ha pasado aquí",
  threadCount: (n: number) => (n === 1 ? "1 nota" : `${n} notas`),
  /** Said once, under an empty thread. An open case with nothing written on
   *  it is the normal state of a new report, not a fault. */
  threadEmptyHint:
    "Si vas, o si ya fuiste, escribe una nota. Es lo que le dice a la siguiente persona qué falta.",
  /** Marks the entry this reader just wrote, so their own note is findable in
   *  a thread that may be long. */
  threadYours: "Tu nota",
  threadNoPhone: "Sin contacto",
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

/**
 * How long ago an entry was written, as the thread prints it.
 *
 * Bare and short — "hace 2 h", not "Confirmado hace 2 horas" — because in a
 * feed the timestamp is a corner label on somebody else's sentence, not a
 * statement of its own. `freshness` above stays as it is: it is making a
 * claim about a whole case being stale, which is a different thing to say.
 *
 * Anything past a week falls back to a date. "hace 23 días" is a number a
 * reader has to convert; a date is one they can compare to the day the
 * earthquake happened.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const elapsedMs = now - new Date(iso).getTime();
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return relative.format(-minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");

  const days = Math.floor(hours / 24);
  if (days <= 7) return relative.format(-days, "day");

  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

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
/**
 * One icon per entry kind, on the buttons that write them.
 *
 * The four buttons are four short sentences stacked in a card that already
 * holds a description, a contact block and a thread, and at that density the
 * eye reads shape before it reads words. The icons are chosen so the shape
 * says the same thing as the sentence: an open hand offering, a tick for
 * something done, an arrow turning back for a case that has to reopen, a
 * flag for the one that is a report about the listing rather than about the
 * job.
 */
export const WORK_ORDER_UPDATE_KIND_ICON: Record<WorkOrderUpdateKind, LucideIcon> = {
  on_the_way: HandHelping,
  helped: CircleCheck,
  still_needed: RotateCcw,
  not_real: Flag,
};

export const WORK_ORDER_UPDATE_PLACEHOLDER: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "Voy mañana a las 8 con volqueta. Falta quien ayude a cargar.",
  helped: "Saqué dos volquetadas. Falta despejar el andén.",
  still_needed: "Pasé hoy y sigue igual, no ha ido nadie.",
  not_real: "Es la misma casa que ya está reportada más arriba.",
};

/**
 * What the note box already says when the composer opens.
 *
 * The note is required — an entry with no words is a counter moving with
 * nothing behind it, and the counters are what close a case. But requiring it
 * put a blank textarea between somebody standing in the street and the tap
 * they came to make, and "no se me ocurre qué escribir" is a real reason a
 * case never gets marked.
 *
 * So the box opens already saying the least the entry could say, and it is
 * true by construction: it claims only what the button the reader pressed
 * already claims, and nothing about times, quantities or other people.
 * Whoever has more to say edits it — the placeholder underneath still shows
 * a fuller example — and whoever clears it out gets this back rather than an
 * error, because a cleared box means "no tengo nada que añadir", not "quiero
 * empezar de nuevo".
 *
 * `not_real` is the one that is deliberately hedged. It is the only entry
 * that says something about a household rather than about a job, so the
 * default says "creo que", which is the honest strength of a stranger's
 * report — and a curator, not this entry, is what actually rejects a case.
 */
export const WORK_ORDER_UPDATE_DEFAULT_NOTE: Record<WorkOrderUpdateKind, string> = {
  on_the_way: "Voy a intentar ayudar pronto.",
  helped: "Ya aporté con algo en este caso.",
  still_needed: "Contacté y sigue haciendo falta ayuda.",
  not_real: "Creo que este caso no es real.",
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
    "",
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
