import {
  Boxes,
  ClipboardList,
  Cross,
  GlassWater,
  Droplet,
  HardHat,
  HeartPulse,
  Package,
  PawPrint,
  Shovel,
  Tent,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { CallCategory, CallDTO } from "@/data/call/call.dto";
import type { ItemMode, SiteStatus, SiteType } from "@/data/site/site.dto";
import type { TabId } from "@/lib/tabs";

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
 * One form per section, worded for the person standing in it.
 *
 * The generic form used to open with all seven kinds of place at once, which
 * made the first decision of the form the one nobody came to make. Arriving
 * from "Ayudar" already says this is somewhere to give something; arriving from
 * "Necesito" already says it is somewhere to go for help.
 */
export const REPORT_SECTION = {
  help: {
    title: "Reportar dónde ayudar",
    kind: "¿Qué reciben aquí?",
  },
  need: {
    title: "Reportar un punto de ayuda",
    kind: "¿Qué es este lugar?",
  },
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
  zone: "¿En qué sector?",
  zonePlaceholder: "Chipre, cerca del parque",
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
 * Convocatorias — jornadas, brigadas, turnos.
 *
 * "Jornada" and not "convocatoria" everywhere the reader can see. The code says
 * `volunteer_call` because that is what the row is; the city says "jornada de
 * limpieza en Chipre el sábado", and matching the word people already use is
 * what makes a map legible in a hurry.
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
 * What a call is doing right now, which is the only question a reader has about
 * one. Deliberately the same four colours as a site's status, carrying the same
 * meaning — green helps you right now, amber not yet, red do not go, grey over —
 * so the map teaches one grammar instead of two.
 */
export type CallState = "live" | "upcoming" | "full" | "ended";

export function callState(
  call: Pick<CallDTO, "startsAt" | "expiresAt" | "slotsTotal" | "slotsTaken">,
  now: number = Date.now(),
): CallState {
  if (now >= Date.parse(call.expiresAt)) return "ended";
  if (call.slotsTotal !== null && call.slotsTaken >= call.slotsTotal) {
    return "full";
  }
  return now >= Date.parse(call.startsAt) ? "live" : "upcoming";
}

export const CALL_STATE_LABEL: Record<CallState, string> = {
  live: "En curso",
  upcoming: "Próxima",
  full: "Cupos llenos",
  ended: "Ya terminó",
};

export const CALL_STATE_MARKER: Record<CallState, string> = {
  live: "bg-resolved text-resolved-foreground",
  upcoming: "bg-claimed text-claimed-foreground",
  full: "bg-unclaimed text-unclaimed-foreground",
  ended: "bg-stale text-background",
};

export const CALL_STATE_STYLE: Record<CallState, string> = {
  live: "bg-resolved-surface text-resolved border-resolved/30",
  upcoming: "bg-claimed-surface text-claimed border-claimed/30",
  full: "bg-unclaimed-surface text-unclaimed border-unclaimed/30",
  ended: "bg-stale-surface text-stale border-stale/30",
};

/**
 * How many people said they would come.
 *
 * Without a stated total the count is still shown, because "ya somos ocho" is
 * what makes the ninth person go. Zero says so in words rather than as a
 * number: "0 apuntados" reads as a failed event, and "sé el primero" is the
 * same fact pointed at the reader.
 */
export function slotsLabel(call: Pick<CallDTO, "slotsTotal" | "slotsTaken">) {
  if (call.slotsTotal !== null) {
    return `${call.slotsTaken} de ${call.slotsTotal} cupos`;
  }
  if (call.slotsTaken === 0) return "Sé la primera persona en apuntarte";
  return call.slotsTaken === 1 ? "1 persona apuntada" : `${call.slotsTaken} personas apuntadas`;
}

/**
 * When a shift is, written the way it is spoken in Colombia.
 *
 * Built from `formatToParts` with the period normalised, and that is not
 * cosmetic: es-CO renders "p. m." with a narrow no-break space in the browser
 * and an ordinary one in Node, so the same timestamp produces two different
 * strings and React tears the tree down on hydration. Normalising both to "PM"
 * makes the server and the client agree by construction.
 */
const bogotaClock = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const bogotaCalendar = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** The civil date in Bogotá as YYYY-MM-DD, only ever compared to another one. */
const bogotaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function clock(at: Date): string {
  const found = bogotaClock.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    found.find((part) => part.type === type)?.value ?? "";

  return `${get("hour")}:${get("minute")} ${get("dayPeriod")
    .replace(/\s|\./g, "")
    .toUpperCase()}`;
}

function day(at: Date, now: Date): string {
  const today = bogotaDate.format(now);
  const tomorrow = bogotaDate.format(new Date(now.getTime() + 86_400_000));
  const target = bogotaDate.format(at);

  if (target === today) return "Hoy";
  if (target === tomorrow) return "Mañana";
  return bogotaCalendar.format(at).replace(/\.$/, "");
}

/** "Hoy 8:00 AM – 12:00 PM". The day comes first because during an emergency
 *  the wrong day is the mistake that costs someone a morning. */
export function callWhen(
  call: Pick<CallDTO, "startsAt" | "endsAt">,
  now: Date = new Date(),
): string {
  const starts = new Date(call.startsAt);
  const head = `${day(starts, now)} ${clock(starts)}`;
  if (!call.endsAt) return head;
  return `${head} – ${clock(new Date(call.endsAt))}`;
}

/** The jornadas block at the top of "Ayudar", and the card on the map. */
export const CALL_LABEL = {
  heading: "Jornadas",
  headingHint: "Sitios y horas donde se necesitan manos",
  empty:
    "Todavía no hay jornadas convocadas. Si estás organizando una, publícala y la ciudad la ve hoy mismo.",
  meetingPoint: "Punto de encuentro",
  bring: "Lleva",
  organiser: "Escribir al organizador",
  directions: "Cómo llegar",
  share: "Compartir",
  ended: "Esta jornada ya terminó.",
  endedHint: "Mira las que están abiertas ahora en el mapa.",
  backToMap: "Ver el mapa",
  countOne: "1 jornada",
  countMany: (n: number) => `${n} jornadas`,
} as const;

/**
 * "Quiero participar".
 *
 * The number is optional and the copy says why in the same breath, because a
 * field that looks required and is not gets filled with a fake number, which is
 * worse than a blank: the organiser then thinks they can reach that person.
 */
export const JOIN_LABEL = {
  join: "Quiero participar",
  joinTomorrow: "Apuntarme para mañana",
  whatsapp: "Tu WhatsApp",
  whatsappHint:
    "Opcional. Solo lo ve quien convocó la jornada, y es como te avisa si se cancela o se cambia la hora.",
  submit: "Apuntarme",
  submitting: "Apuntando…",
  joined: "Listo, quedaste apuntado",
  joinedHint: "Llega al punto de encuentro a la hora. Si no puedes, avísale al organizador.",
  already: "Ya estabas apuntado a esta jornada",
  full: "Ya se llenaron los cupos",
  failed: "No se pudo apuntar. Intenta otra vez.",
  cancel: "Ahora no",
  attendees: "Quién se apuntó",
  attendeesHint:
    "Solo tú ves esta lista, porque tú convocaste. Escríbeles antes de la hora.",
  attendeesEmpty: "Todavía nadie se ha apuntado.",
  noContact: "Sin número",
  tomorrowTag: "Para mañana",
} as const;

/**
 * The form that convenes a jornada.
 *
 * It is the only form in this app that ends at a sign-in wall, and the copy
 * says why at that exact moment rather than as a rule at the door — see
 * AUTH_LABEL.gateReason.
 */
export const CALL_FORM = {
  title: "Convocar una jornada",
  subtitle:
    "Sale al mapa de una vez. Quien quiera ir se apunta con un toque y tú recibes sus contactos.",
  category: "¿Qué se va a hacer?",
  callTitle: "¿Cómo se llama la jornada?",
  callTitlePlaceholder: "Limpieza de escombros en la calle 24",
  description: "¿Qué hay que hacer?",
  descriptionPlaceholder:
    "Sacar escombros de dos casas y despejar el andén. Somos vecinos del barrio.",
  barrio: "¿En qué barrio se encuentran?",
  where: "Ajusta el punto de encuentro",
  whereHint:
    "El mapa ya está en el barrio. Arrastra unos metros hasta la esquina exacta.",
  whereLocked: "Elige el barrio y el mapa se abre ahí.",
  barrioRequired:
    "Elige primero el barrio. Sin eso el punto de encuentro queda en el centro de la ciudad.",
  meetingAddress: "¿Dónde exactamente se ven?",
  meetingAddressPlaceholder: "Frente a la tienda, portería del conjunto…",
  meetingAddressHint:
    "Diez personas tienen que llegar al mismo sitio a la misma hora. La esquina importa.",
  starts: "¿Cuándo empieza?",
  ends: "¿A qué hora termina?",
  endsHint: "Opcional. Si no lo pones, la jornada sale del mapa seis horas después de empezar.",
  slots: "¿Cuánta gente necesitas?",
  slotsHint: "Opcional. Déjalo vacío si entre más manos mejor.",
  bring: "¿Qué hay que llevar?",
  bringPlaceholder: "Guantes, pala, tapabocas, agua.",
  whatsapp: "Tu WhatsApp",
  whatsappHint:
    "Opcional, y visible para todos: es para que te pregunten si la jornada sigue en pie.",
  submit: "Publicar la jornada",
  submitting: "Publicando…",
  nearbyTitle: "Ya hay una jornada parecida",
  nearbyBody:
    "Está muy cerca y casi a la misma hora. Si es la misma, apúntate en vez de partir el grupo en dos.",
  nearbyIgnore: "No es la misma, publicar igual",
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
export const SERVICES_LABEL = {
  title: "Servicios prestados",
  empty:
    "Aquí van los servicios que la gente presta: volqueta, carro, herramienta, bodega, transporte y hogar de paso.",
  soon: "Todavía no está abierto para publicar.",
  meanwhile:
    "Mientras tanto, si tienes con qué ayudar, repórtalo en Ayudar y alguien lo verá hoy mismo.",
  cta: "Ir a Ayudar",
} as const;

/**
 * What each section says when it holds nothing yet.
 *
 * Never "no hay resultados": that reads as a broken app during an emergency,
 * and it is also false. It says who fills this section and how, so an empty
 * screen is an invitation instead of a dead end.
 */
export const SECTION_EMPTY: Record<TabId, string> = {
  help: "Todavía nadie ha reportado dónde ayudar. Si sabes de un acopio o una jornada, repórtalo y sale al mapa de una vez.",
  need: "Todavía no hay albergues ni puntos de censo publicados en el mapa.",
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
export const BARRIO_TOGGLE = {
  title: "Mostrar también",
  label: "Barrios",
  hint: "División oficial de la Alcaldía",
  clear: "Quitar el filtro de barrio",
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
  countOne: "1 punto en este barrio",
  countMany: (n: number) => `${n} puntos en este barrio`,
  empty: "Nadie ha reportado nada en este barrio todavía. Que esté vacío no quiere decir que no haga falta ayuda.",
  clear: "Ver toda la ciudad",
} as const;

/**
 * The Alcaldía's own phone lines, in the reference drawer.
 *
 * They are here because they answer something this map deliberately does not:
 * a damaged house nobody has reported yet, and a missing person. Missing people
 * are out of scope as a feature — we do not hold that data — but refusing to
 * show the official number for it would be withholding the one useful thing we
 * can say about it.
 *
 * `tel:` links: this is read on a phone, standing outside a cracked house.
 */
export const OFFICIAL_LINES = {
  title: "Líneas oficiales",
  hint: "Alcaldía de Manizales. Reporta solo lo que aún no hayas reportado.",
  lines: [
    {
      number: "132",
      dial: "132",
      what: "Personas desaparecidas y daños estructurales sin reportar",
    },
    {
      number: "320 263 8306",
      dial: "+573202638306",
      what: "Censo de daños en viviendas y establecimientos",
    },
  ],
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
