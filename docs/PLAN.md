# Plan — Manizales de Pie

Estado al 14 de agosto de 2026, 04:30 (día 4 del sismo del 10 de agosto).

Este documento existe para que la siguiente sesión no vuelva a decidir lo ya
decidido. Todo lo de aquí salió de una conversación larga con el dueño del
producto; donde hay una razón, está escrita, porque la razón es lo que el
código no puede mostrar.

---

## 1. La reorganización pendiente (lo más importante)

La app se reordena **por intención del usuario**, no por tipo de objeto. Esta
es la decisión más grande sin implementar y **reemplaza el modelo de capas
actual** (`lib/layers.ts`).

### Cuatro pestañas de primer nivel

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
- **Comunas** desde OSM con resaltado al pasar e indicador permanente de en qué
  comuna está el centro. Sin tooltip, por decisión explícita.
- **Enlace por punto** `/punto/[id]` con OpenGraph → tarjeta en WhatsApp.
- **Formulario público de sitios**, anónimo, con detección de duplicados a 120 m.
- **Animales**: entidad, tablero de fotos, formulario con compresión en el
  navegador, marcador punteado de avistamiento.
- **Auth Google** con registro diferido (`PublishGate` + `useDraft`).
- **Sheet de balance** con el reporte diario de la Alcaldía.
- **Reloj en vivo** y `lib/curfew.ts`.

---

## 3. Qué falta, en orden

1. **La reorganización de la sección 1.** Reemplaza `lib/layers.ts` y
   `layer-control.tsx` por pestañas.
2. **Convocatorias** (`volunteer_call`): DTO, policy, DAL, actions, UI y el
   flujo **"quiero participar"**.
   - Crear una convocatoria **exige cuenta** (es el único caso: quien convoca
     recibe teléfonos de terceros y debe poder responder por ellos).
   - Apuntarse **no** exige cuenta. WhatsApp opcional.
   - Duplicados por **radio + ventana de tiempo**; al chocar, ofrecer unirse.
3. **Órdenes de trabajo** (`work_order`): faltan los estados
   `open_assigned` y `open_needs_followup`, la bandera de escombros retirados y
   el enum de **motivos de bloqueo** (falta volqueta, requiere demolición, sin
   contacto, requiere bomberos).
4. **Solicitudes de ayuda**: entidad nueva, aún sin crear. Conteos del hogar
   sí (mujeres, niños, adultos mayores, mascotas); condiciones médicas **no**.
5. **Ofertas de recursos** = la pestaña Servicios. Añadir *hogar de paso* al
   enum.
6. **Consola `/admin`**, una sección por entidad. `signOut` ya existe y no
   tiene quién lo llame.
7. **Turnstile** en los formularios públicos (faltan las llaves).
8. **Franja de réplicas del SGC** (solo aviso, sin mapa de calor).
9. **Cablear el toque de queda**: `lib/curfew.ts` existe y nadie lo usa.
10. **Coropleta de necesidad desatendida por comuna** — bloqueada hasta que
    haya órdenes de trabajo.

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
- **`document.querySelector('[name="description"]')`** encuentra el `<meta>` del
  `<head>` antes que el campo del formulario.
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

7 puntos publicados, todos específicos de la emergencia: 2 albergues, el punto
oficial de donaciones (Coliseo Menor, entrada A por la Av. Lindsay), 2 de
sangre, el PMU y el punto de censo de Fundadores. Más el balance del Reporte 10
de la Alcaldía y las 12 comunas en `public/comunas.geojson`.

El seed original tenía las coordenadas mal por entre 0,9 y 7,8 km.
