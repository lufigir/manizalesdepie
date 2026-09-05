# Manizales de Pie

Mapa vivo de la ayuda para **Manizales y Villamaría** (Caldas, Colombia),
después del sismo de magnitud 7.4 del 10 de agosto de 2026.

El producto responde una sola pregunta: **«¿dónde ayudo hoy?»** Todo lo que
hay en este código existe para contestarla en los primeros tres segundos.

> ## Esto es una demo de portafolio
>
> **Ningún caso, dirección, teléfono ni persona de este mapa es real.** La
> emergencia que el producto atendía terminó, y mantenerlo conectado a una
> base de datos ya no tiene sentido, así que corre sobre datos ficticios
> escritos a mano: ~70 pines repartidos por barrios reales de Manizales, con
> hilos de novedades poblados para que se vean los estados y los colores.
>
> Lo que sí es real es el producto: los formularios funcionan, las
> validaciones y las reglas de autorización corren de verdad, y lo que
> reportes aparece en el mapa. Vive en tu navegador durante la visita y se
> borra al recargar. En el menú de la esquina superior izquierda puedes
> ponerte el sombrero de **curador** y ver la otra mitad de la aplicación:
> los reportes ocultos, publicar, ocultar, cerrar y eliminar.
>
> Cómo funcionaba en producción está más abajo, en
> [Lo que había detrás](#lo-que-había-detrás).

Las convenciones, la regla de dependencias y los guardrails viven en
[`AGENTS.md`](./AGENTS.md). Ese archivo se lee antes de escribir código.

---

## Cómo correrlo

No necesitas nada: ni base de datos, ni claves, ni cuenta en ningún servicio.

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_SITE_URL` es la única variable de entorno que existe, y es
opcional: sin ella se usa el dominio de producción de Vercel o
`http://localhost:3000`. Solo importa para que las tarjetas de WhatsApp y
Twitter resuelvan la imagen absoluta de cada enlace compartido.

## De dónde salen los datos

| | |
|---|---|
| `lib/demo/fixtures/*.json` | Los sitios, las necesidades con sus hilos, los servicios y los reportes de mascotas. Inventados. |
| `lib/demo/fixtures/sectors.json` | Los 178 *sectores* que la gente sí nombra ("Topacio", "Venecia"), extraídos de la nomenclatura oficial. |
| `public/barrios.geojson` | Los 114 barrios oficiales de la Alcaldía, con su polígono. El navegador los dibuja y el servidor los usa para saber en qué barrio cae cada pin. |
| `public/mascotas/` | Fotos de licencia libre desde Wikimedia Commons — créditos en [`public/mascotas/CREDITOS.md`](./public/mascotas/CREDITOS.md). |

Las fechas no se guardan como fechas sino como una **antigüedad** («hace 6
horas»), y `lib/demo/dataset.ts` las resuelve contra el reloj en cada
petición. Sin eso la demo leería «hace 8 meses» en todos los pines y el mapa
se vería muerto el día que alguien lo abra.

El barrio de cada pin no está escrito en el fixture: se deriva del punto, con
el mismo point-in-polygon que usa el mapa. Es lo que hacía el trigger
`*_sets_neighborhood` en Postgres, y se conserva por la misma razón — un
fixture no puede reclamar un barrio en el que su coordenada no cae.

## Cómo está armado

```
app/  →  data/  →  lib/
```

- `app/` — rutas, layouts y componentes colocados. Nada más.
- `data/` — la única puerta a los datos. Cuatro archivos por entidad: `dto`
  (esquemas Zod), `policy` (predicados puros), `dal` (la clase con
  constructor privado) y `actions` (orquestación).
- `lib/` — plomería compartida: el dataset, los textos, el logging.

Las fronteras no son documentación, son reglas de lint: `eslint.config.mjs`
y `oxlint.config.ts` niegan por defecto que la UI lea la fuente de datos, y
que algo en `data/` que no sea un `*.dal.ts` la toque.

Lo que cambió al quitar la base de datos es **el otro lado de cada mutación**.
No hay a dónde escribir, así que una mutación valida, autoriza y *devuelve* la
fila que habría escrito; el navegador la guarda por el resto de la visita
(`app/(map)/_components/demo-store.tsx`). El orden dentro de cada mutación no
cambió y sigue siendo la regla: validar entrada → autorizar → mutar → validar
salida.

## Lo que había detrás

El proyecto corría sobre Supabase, y ese diseño sigue versionado aquí porque
es la mitad más interesante del trabajo:

| | |
|---|---|
| [`supabase/migrations/`](./supabase/migrations) | 36 migraciones: PostGIS, nueve tablas, vistas `security_invoker`, RPC de proximidad y todas las políticas de row-level security. |
| [`supabase/seed.sql`](./supabase/seed.sql) | El seed original, con datos de prensa. **No se usa en la demo** y sus coordenadas nunca fueron verificadas. |
| [`supabase/barrios.sql`](./supabase/barrios.sql), [`sectors.sql`](./supabase/sectors.sql) | Los barrios y sectores oficiales, cargados desde los datos abiertos de la Alcaldía por los scripts de `scripts/`. |

Vale la pena leer las migraciones por los comentarios: cada una explica qué
decisión de producto la provocó. `20260816030000_cases_never_auto_close.sql`
es la mejor de todas.

Qué hacía la base que ahora hace otra cosa:

| Antes | Ahora |
|---|---|
| Row-level security decidía quién veía qué | Un filtro explícito en cada `listPublished` del DAL |
| El trigger `sync_need_state` derivaba el estado de un caso de su propio hilo | `deriveNeedState`, una función pura en `data/need/need.policy.ts` |
| PostGIS resolvía el barrio de un punto (`neighborhood_at`) | Point-in-polygon sobre `barrios.geojson`, en `lib/demo/dataset.ts` |
| El operador `<->` contra un índice GiST buscaba pines cercanos | Haversine sobre las filas, en `SiteDAL.findNearby` |
| Supabase Auth con Google resolvía la identidad y el rol | Una cookie que dice qué sombrero lleva puesto quien está leyendo |
| Supabase Storage guardaba las fotos de mascotas | Archivos en `/public`, y `data:` URL para lo que suba un visitante |
| Un canal realtime pintaba el estado de los sitios en vivo | Nada: se quitó en vez de simularlo |

## Riesgos y límites, asumidos a propósito

- **Nada se guarda.** Lo que reportes en la demo desaparece al recargar. Es
  deliberado: un store en el servidor no sobreviviría a Vercel repartiendo las
  peticiones entre instancias, y `localStorage` haría que el mapa se
  contradijera entre el render del servidor y el del navegador.
- **Los contactos no marcan.** Un número inventado es el número real de
  alguien, así que los botones de teléfono y WhatsApp explican que son de
  ejemplo en vez de llamar.
- **Sin soporte offline.** Se decidió en contra con la evidencia sobre la
  mesa; la discusión está en `AGENTS.md`.
- **mapcn fija maplibre-gl en v5.** La v6 quitó el export por defecto que
  `components/ui/map.tsx` importa y el build falla. No subirlo hasta que
  mapcn lo suba.
