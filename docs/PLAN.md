# Plan — Manizales de Pie

Estado al 14 de agosto de 2026, 04:30 (día 4 del sismo del 10 de agosto).

Este documento existe para que la siguiente sesión no vuelva a decidir lo ya
decidido. Todo lo de aquí salió de una conversación larga con el dueño del
producto; donde hay una razón, está escrita, porque la razón es lo que el
código no puede mostrar.

---

## 1. La reorganización — HECHA el 14 de agosto

La app se reordenó **por intención del usuario**, no por tipo de objeto.
`lib/layers.ts` y `layer-control.tsx` ya no existen; los reemplaza `lib/tabs.ts`.

### Cómo quedó

- **Cuatro rutas**, no estado de cliente: `/ayudar`, `/necesito`, `/mascotas`,
  `/servicios`. `/` redirige a `/ayudar`. Se eligieron rutas por el enlace
  compartible en WhatsApp y porque cada sección cuelga su propio formulario.
- **El mapa vive en `app/(map)/(tabs)/layout.tsx`** y cada página aporta solo su
  panel. Es lo que evita que MapLibre se remonte al cambiar de sección: se
  perdía la cámara y parpadeaba. La selección compartida entre mapa y panel va
  por contexto (`workspace-context.ts`), porque un layout no puede pasar props
  a sus children.
- **Un formulario por sección**: `/reportar/ayudar` y `/reportar/necesito`
  ofrecen solo los tipos de su sección. El genérico `/reportar` se eliminó.
- **Servicios se muestra vacío**, con texto que dice qué irá ahí. Sin
  formulario: uno que botara lo escrito sería peor que no tener la sección.

### Reparto de tipos de sitio

| Tipo | Sección |
|---|---|
| `collection_point`, `blood_donation`, `medical_post` | Ayudar |
| `shelter`, `census_point` | Necesito |
| `water_point`, `vet_clinic` | **Ninguna** — no se dibujan |

`medical_post` es el PMU, que no es un hospital: es donde a quien llega a
ayudar le dicen a dónde ir, y por eso va en Ayudar. Los valores siguen en el
enum de Postgres porque no se pueden borrar y porque las filas existentes deben
seguir validando.

### Las cuatro pestañas de primer nivel

| Pestaña | Contenido | Forma |
|---|---|---|
| **Ayudar** (entrada por defecto) | Acopios, donación de sangre, jornadas, escombros, familias que piden | Mapa + lista |
| **Necesito** | Albergues, puntos de censo/subsidio, puntos de entrega de ayudas | Mapa + lista |
| **Mascotas** | Perdidos, encontrados, avistados | Tablero de fotos + mapa pequeño |
| **Servicios** | `resource_offer`: volqueta, carro, herramienta, bodega, transporte, hogar de paso | Tarjetas |

**Por qué esta división y no la actual:** las capas de hoy mezclan intención
(*Ayudar*) con tipo de objeto (*Animales*), y por eso se siente enredado. La
investigación en plataformas de desastre encontró la misma división por su
cuenta: *dónde trabajar / dónde conseguir servicios / contexto*.

### Reglas que se derivaron

- **Las necesidades se ven en "Ayudar", se crean desde "Necesito".** Una
  solicitud de familia la escribe alguien afectado y la lee alguien que va a
  actuar. Cada mapa responde una sola pregunta.
- **Donar sangre va en "Ayudar"**, no en "Necesito": quien dona está dando.
- **Un formulario por sección**, no uno genérico que pregunte primero. El
  contexto de la pestaña ya dice qué se va a reportar.
- **Ayudar es la pestaña por defecto**: es la mayoría de quien abre la app.

---

## 2. Qué está construido y funcionando

- **Mapa** con icono = tipo, color = estado, solidez = confianza.
- **Agrupación de pines** propia (no `MapClusterLayer`, que dibuja círculos y
  no admite marcadores HTML). Incluye **abanico** para puntos en coordenadas
  idénticas, que el zoom no puede separar nunca.
- **Popover anclado al pin** (no sheet inferior: tapaba el mapa).
- **Barrios**, que reemplazaron a las comunas el 14 de agosto: nadie dice "estoy
  en la Comuna 4", dice "estoy en Chipre".
  - Resaltado al pasar y **etiqueta con el nombre siguiendo al cursor**. Reabre
    la decisión de "sin tooltip", que se tomó cuando el nombre era el de una
    comuna y no le decía nada a nadie.
  - **Nombres dibujados en el mapa** desde zoom 14, con los del basemap de CARTO
    ocultos para que no salgan dos juegos de nombres.
  - **Clic en un barrio**: la cámara vuela a él y el panel se limita a él, pero
    **el mapa sigue mostrando todos los puntos de la ciudad**. Ocultar los pines
    de los demás barrios fue un error y se corrigió: el mapa es justo cómo uno
    se entera de que el acopio más cercano queda en el barrio de al lado.
  - **El barrio se estampa solo**, por geometría, con un trigger en Postgres
    (`set_neighborhood_from_location`). Vale para `site`, `volunteer_call`,
    `work_order` y `resource_offer`, así que las convocatorias quedan agrupadas
    por barrio sin trabajo extra. Está en la base y no en el DAL porque las
    hojas de cálculo reales se van a cargar por MCP, sin pasar por la app.
- **Cuatro secciones por intención** (§1), cada una con su ruta y su formulario.
- **Convocatorias** (`volunteer_call`), desde el 14 de agosto. Viven en Ayudar:
  bloque «Jornadas» encima de la lista de puntos, pin cuadrado en el mapa (un
  sitio se distingue de una cita antes de leer el icono) y color = estado
  temporal (en curso / próxima / cupos llenos / terminó), con la misma gramática
  de color que el estado de un sitio.
  - **Crear exige cuenta**, el único caso en toda la app. No es desconfianza del
    dato: es que desde que existe la fila, otras personas mueven su sábado y le
    entregan su teléfono a quien convocó. El muro está al final (`PublishGate`)
    y el borrador incluye el pin, porque el viaje a Google pasa a mitad de
    formulario y una coordenada que vuelve sola al centro de la ciudad es peor
    que perder el texto.
  - **Apuntarse no exige nada**, ni el teléfono. Como no hay cuenta con qué
    deduplicar a un anónimo, el navegador recuerda a qué jornadas se apuntó en
    `localStorage` — solo ids.
  - **Duplicados por radio Y ventana de tiempo** (150 m, ±3 h). Solo por
    distancia se fusionarían la jornada del sábado y la del domingo en el mismo
    parque, que es peor que un pin repetido.
  - **`/jornada/[id]`** con OpenGraph, que es por donde de verdad circula esto:
    en el grupo de WhatsApp se pierden siempre la esquina exacta y la hora.
    Quien convocó —y solo esa persona— ve ahí la lista de quién se apuntó.
- **Enlace por punto** `/punto/[id]` con OpenGraph → tarjeta en WhatsApp.
- **Formulario público de sitios**, anónimo, con detección de duplicados a 120 m.
- **Ubicación por barrio**, desde el 14 de agosto, en los formularios de punto y
  de jornada. Antes abrían un mapa de toda la ciudad y pedían encontrar la
  propia calle en él, que es la versión difícil de la pregunta: quien reporta
  está parado en el sitio, con una barra de señal, y el mapa arranca a cuatro
  kilómetros. Ahora se nombra el barrio —la versión fácil, nadie en Manizales
  tiene que pensarla— y el mapa se abre ahí, a zoom de calle.
  - Combobox con búsqueda que pliega tildes («fatima» encuentra «Fátima»), botón
    **«el barrio donde estoy»** por geolocalización (barrio más cercano por
    centroide, no point-in-polygon: los polígonos pesan 149 KB y esto es una
    preselección que se cambia con un toque), y **texto obligatorio** de «¿dónde
    exactamente?», que es lo que ahora carga la precisión.
  - **El barrio elegido NO se guarda.** Lo sigue estampando el trigger según
    dónde caiga el pin, así que el dato y el mapa no se pueden contradecir. El
    selector apunta la cámara; la copia dice eso y no más.
  - Tocar un barrio en el mapa lleva `?barrio=Chipre` al formulario. Va en la
    URL porque el mapa vive en otra ruta: así sobrevive a una recarga.
  - Villamaría es una entrada más del combobox. La lista sale de
    `neighborhood_public` (118 filas, ~4 KB), no del geojson.
  - Ninguna columna cambió: `address` y `meeting_address` siguen aceptando nulo,
    porque las filas ya publicadas no todas la tienen y las hojas que entren por
    MCP tampoco. La exigencia vive donde está quien puede responderla.
- **Animales**: entidad, tablero de fotos, formulario con compresión en el
  navegador, marcador punteado de avistamiento.
- **Auth Google** con registro diferido (`PublishGate` + `useDraft`).
- **Sheet de balance** con el reporte diario de la Alcaldía.
- **Reloj en vivo** y `lib/curfew.ts`.

---

## 3. Qué falta, en orden

1. **Órdenes de trabajo** (`work_order`): faltan los estados
   `open_assigned` y `open_needs_followup`, la bandera de escombros retirados y
   el enum de **motivos de bloqueo** (falta volqueta, requiere demolición, sin
   contacto, requiere bomberos).
2. **Solicitudes de ayuda**: entidad nueva, aún sin crear. Conteos del hogar
   sí (mujeres, niños, adultos mayores, mascotas); condiciones médicas **no**.
   Es lo que hará que el botón de "Necesito" diga *pedir ayuda* y no *reportar
   un punto*.
3. **Ofertas de recursos** = la sección Servicios, hoy vacía con su explicación.
   Añadir *hogar de paso* al enum.
4. **Consola `/admin`**, una sección por entidad. `signOut` ya existe y no
   tiene quién lo llame. Ahí van también `verifyCall` y el resto de acciones de
   curador, que hoy existen sin pantalla.
5. **Turnstile** en los formularios públicos (faltan las llaves).
6. **Franja de réplicas del SGC** (solo aviso, sin mapa de calor).
7. **Terminar de cablear el toque de queda**: ya decide el «apuntarme para
   mañana» de las jornadas (`for_tomorrow`); falta el aviso general en el mapa.
8. **Coropleta de necesidad desatendida por comuna** — bloqueada hasta que
   haya órdenes de trabajo. `public/barrios.geojson` ya trae la comuna de cada
   barrio, así que agregar de barrio a comuna no necesita otra fuente.

---

## 4. Decisiones que NO hay que reabrir

- **Publicación abierta.** Se publica al instante; la confianza se **muestra**
  (sin confirmar → confirmado por N → verificado), no se filtra. El curador
  baja cosas, ya no las deja pasar.
- **`no_longer_valid` no incrementa el contador.** Decir que algo ya no existe
  no es evidencia de que exista.
- **Cuenta solo para lo que compromete a otros.** Reportar es anónimo.
- **`work_order_contact` nunca se publica.** Coordenada pública difuminada.
- **Nada se borra por estar viejo**, se etiqueta y se degrada.
- **Fuera de alcance:** personas desaparecidas (Cruz Roja), dinero y
  recaudación, **vías cerradas** (eliminadas el 14 de agosto), hospitales y
  veterinarias (la gente ya sabe dónde quedan).
- **Retención de datos personales: aplazada.** Decisión pendiente, no olvido.
- **Turnstile: aprobado**, faltan llaves.
- **Agua y veterinarias salen del mapa** (14 de agosto), junto con hospitales.
  Los tipos siguen en el enum de Postgres porque no se pueden borrar; el mapa
  simplemente no los dibuja (`SITE_TYPE_TAB` → `null`).
- **Los barrios salen del SIG de la Alcaldía y son oficiales.** 114 polígonos de
  la capa "Límite de barrios" (Acuerdo Municipal 589 de 2004), en el portal
  ArcGIS `geodata-manizales-sigalcmzl.opendata.arcgis.com`.
  `scripts/fetch-barrios.mjs` los descarga, simplifica y escribe
  `public/barrios.geojson`, con la comuna de cada barrio incluida.
  - **La creencia anterior era falsa:** "no existen polígonos de barrio" está
    escrito en `fetch-comunas.mjs` y llevó a construir un Voronoi sobre los
    puntos de OSM. Se descartó al aparecer la fuente real. **Antes de derivar
    geometría, buscar en el portal de datos abiertos de la Alcaldía.**
  - Los nombres oficiales vienen en mayúscula sin tildes; el script les pone la
    ortografía correcta cruzando con OSM (97 de 114) y capitaliza el resto.
  - **Villamaría no está**: su municipio no publica capa equivalente, así que
    al otro lado del río el indicador no dice barrio.
  - `public/comunas.geojson` se queda: la comuna sigue siendo la unidad de
    agregación, y ahora cada barrio trae la suya.

---

## 5. Correcciones que le faltan a `AGENTS.md`

- El reclamo real de Crisis Cleanup es de **6 días**, no 48 horas.
- Existe un **límite por persona**: ~20 casos con menos del 50 % cerrado bloquea
  reclamar más.
- Falta anotar la retención de datos personales como pendiente.
- `components/ui/` ya no es solo shadcn/mapcn: ahora es **coss** (Base UI).

---

## 6. Trampas encontradas (no volver a caer)

- **`next.config.ts` solo se lee al arrancar.** Cambiar `remotePatterns` con el
  dev server corriendo no aplica; el build pasa igual porque relee la config.
- **`favicon` solo acepta `.ico`.** Para PNG la convención es `app/icon.png`.
- **`z.iso.datetime()` exige sufijo `Z`.** PostgREST emite offset → hace falta
  `{ offset: true }`.
- **`getComputedStyle` devuelve `lab()`** para una paleta en `oklch()`, y
  MapLibre lo rechaza. Convertir pintando un píxel en canvas.
- **Intl difiere entre Node y el navegador** (incluye espacios estrechos sin
  ruptura dentro de "p. m."), y eso rompe la hidratación.
- **`ALTER TYPE ... ADD VALUE`** necesita su propia migración.
- **`onHover` de mapcn solo dispara al CAMBIAR de feature.** Si se necesita en
  cada movimiento, hay que registrar el listener propio.
- **React desmonta un subárbol borrado de PADRE a HIJO.** `<Map>` llama
  `map.remove()` en su limpieza, que hace `setStyle(null)`, así que cualquier
  limpieza de un hijo que pregunte por capas explota dentro de MapLibre —
  `getLayer` no devuelve `undefined`, revienta. Se sale temprano con
  `if (!map.style) return`.
- **Una prop `[lng, lat]` es un array nuevo en cada render.** Si un efecto
  depende de ella y mueve el mapa, el `moveend` actualiza el formulario, el
  formulario re-renderiza y el efecto vuelve a correr: bucle infinito que React
  reporta como «Maximum update depth exceeded» y que no se ve leyendo el diff.
  Se pasan dos números.
- **`document.querySelector('[name="description"]')`** encuentra el `<meta>` del
  `<head>` antes que el campo del formulario.
- **Borrar una ruta deja tipos generados obsoletos.** `.next/dev/types/
  validator.ts` sigue importando el `page.js` que ya no existe y `tsc` falla con
  TS2307 aunque el código esté bien. Se borra `.next/dev` y listo.
- **Overpass responde 504 de forma intermitente**, a veces en los dos espejos a
  la vez y minutos después funciona. Cualquier script que dependa de él necesita
  espejos, reintentos y un camino sin él: `fetch-barrios.mjs` sigue funcionando
  sin Overpass, solo que sin tildes.
- Verificar siempre que una prueba falle por el motivo correcto: una que barre
  toda la pantalla cruza comunas y oculta justo el bug que se busca.

---

## 7. Pendiente fuera del código

1. **Turnstile**: crear llaves en Cloudflare.
2. **Dominio**: añadir `manizalesdepie.co` en Vercel + DNS.
3. **Supabase → Auth → URL Configuration**: cambiar Site URL y redirects al
   dominio nuevo, o el login se rompe ahí.
4. **Renombrar el proyecto Supabase** a `manizalesdepie` (el MCP no lo expone;
   es solo cosmético, el ref `lriozoktdpkggzywimek` no cambia).
5. **Favicon cuadrado**: el actual es 1013×677 y el navegador lo deforma.
6. Las dos hojas de cálculo reales (escombros y familias) **nunca van a git**;
   se cargan por MCP directo a Postgres cuando existan sus entidades.

---

## 8. Datos en la base ahora

8 puntos publicados, todos específicos de la emergencia: 2 albergues, el punto
oficial de donaciones (Coliseo Menor, entrada A por la Av. Lindsay), 2 de
sangre, el PMU, el punto de censo de Fundadores y —desde el 14 de agosto— el
**Centro de Acopio del Concejo Municipal de Villamaría** (Carrera 5 N.° 4-75,
Parque Bolívar), el primer punto del otro lado del río. Su coordenada es la de
la Alcaldía, a unos 60 m del tramo de la Carrera 5 que corresponde a esa
dirección: geocodificada, no verificada en terreno.

Más el balance del Reporte 10 de la Alcaldía, las 12 comunas en
`public/comunas.geojson` y los 114 barrios oficiales, tanto en
`public/barrios.geojson` como en la tabla `neighborhood`.

El seed original tenía las coordenadas mal por entre 0,9 y 7,8 km.
