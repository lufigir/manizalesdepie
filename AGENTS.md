<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Manizales de Pie

Live map of earthquake relief for Manizales and Villamaría (Caldas, Colombia),
after the magnitude 7.4 event of 10 August 2026.

The product answers one question: **"¿dónde ayudo hoy?"** It is not a directory.
When a change makes that question harder to answer in the first three seconds,
the change is wrong regardless of how good the feature is.

## This runs as a demo: there is no database

The emergency is over and the Supabase project is gone. What replaces it is
`lib/demo/dataset.ts` plus the JSON beside it: a fixed snapshot of invented
reports, read at request time, plus `public/barrios.geojson` for the barrio
each pin falls in. Every name, phone and address in the fixtures is made up,
and the copy says so — see `DEMO_LABEL` and `demo-banner.tsx`.

The shape of the code did not change with the backend, and that is the point:
DTOs, policies and the DAL classes with private constructors are all still
here, and the import boundaries below still deny by default. What changed is
the far side of a mutation. **There is nowhere to write, so a mutation
validates, authorizes and RETURNS the row it would have written**; the browser
holds it for the rest of the visit (`app/(map)/_components/demo-store.tsx`).
A server action therefore returns a DTO or a patch and calls no
`revalidatePath`: re-rendering would hand back the same fixture and discard
what the reader just did.

Two things the database used to do now live in code, and both are load-bearing:

- `deriveNeedState` in `data/need/need.policy.ts` is the `sync_need_state`
  trigger, as a pure function. Server and browser both derive a case's status
  from its own thread with it.
- `resolveNeighborhood` in `data/geo/geo.dal.ts` is `neighborhood_at`:
  point-in-polygon over the 114 official barrios. The barrio is never sent by
  a caller and never stored in a fixture.

`supabase/` stays in the repo as an artefact: 36 migrations, RLS, PostGIS and
the seed. Nothing runs it, nothing imports it, and
`20260818090000_contract_drop_legacy_names.sql` was never applied. Read it for
the reasoning; do not wire it back in without reopening the decision.

## Language

- **Code, identifiers, comments, commit messages, database: English.**
- **Everything a user reads: Spanish (es-CO).**
- The crossing point is `lib/labels.ts`. A Spanish string never gets hardcoded
  inside a component, or it will drift between two screens.

## The dependency rule

```
app/  →  data/  →  lib/
```

- `app/` holds routes, layouts and colocated components. Nothing else.
- `data/` is the only path to the data. **No `@/lib/demo/*` import in a page,
  a component, a route handler, or an action.** A Server Component importing a
  DAL is correct; that is the intended path.
- `lib/` holds shared plumbing: the dataset, config, logging, labels.

Illegal imports, enforced in `eslint.config.mjs` and mirrored in
`oxlint.config.ts`:

| From | May not import | Why |
|---|---|---|
| `app/`, `components/` | `@/lib/demo/*` | The visibility rules — what a visitor sees versus a curator — live in the DAL's `listPublished`, which is where row-level security's job went. Reading the fixtures directly skips them. |
| `data/**` except `*.dal.ts` | `@/lib/demo/*` | One door to the data, not two. |
| `*.policy.ts` | anything with a session or a query | Policies are pure predicates |
| `app/**`, `components/**` (not `ui/`) | literal Tailwind colours | The palette lives in `app/globals.css` |

Both configs deny by default: an import path is blocked unless it matches a
`!`-negated exception written into the pattern. A new file under `lib/demo/`,
or a real database put back behind the DALs one day, is unreachable from
`app/` or `data/**` the moment it exists, not just after someone remembers to
add it to a list.

## Where a new feature goes

Adding an entity means four files in `data/<module>/`, created in this order:

1. `<module>.dto.ts` — Zod schemas: what goes in, what comes out. Two schemas
   minimum. The output one is the one people skip and the one that matters.
2. `<module>.policy.ts` — pure functions taking what they need, returning a
   boolean. No database, no session, no side effects.
3. `<module>.dal.ts` — `import "server-only"` at the top. A class with a
   private constructor and static factories (`create()` authenticated,
   `public()` for genuinely public reads), so an instance cannot exist without
   a resolved authorization context.
4. `<module>.actions.ts` — `"use server"`. Orchestration only: build the DAL,
   call it, return what it returned.

Copy the shape of `data/site/` exactly. It is the reference implementation.

**Order inside every mutation, no exceptions:** validate input → authorize →
mutate → validate output. Map rows to DTOs explicitly; never spread a stored
row into a response.

## Guardrails — things that never happen here

- **A server action is a public POST endpoint.** Anyone can call it with a
  crafted request. Arriving through our form is not a fact you get to assume,
  so the action checks nothing itself and the DAL checks everything.
- **A necesidad's contact details are public, and the form says so where they
  are typed.** This reverses the original guardrail, deliberately, on 15
  August: `work_order_contact` and `work_order_access` are gone and the
  fields live on `needs` itself (`data/need/need.dal.ts`). The reasoning was
  that the old gate — reveal-once, in exchange for an unverified name and
  phone — protected nobody it claimed to while stopping somebody with a
  volqueta from calling to size up a case before committing to it.
  The fields are optional and stay optional. A report is frequently written
  by a neighbour on somebody else's behalf, so the only thing standing
  between an affected person and a published address is the warning in
  `NEED_FORM.contactHint`. Weaken that copy and the decision above stops
  being defensible — treat it as load-bearing, not as a nicety.
- **A need never closes itself. It cools.** Closing was once one anonymous
  tap that wrote a terminal status, so one bad actor could empty the map.
  Since 15 August `status` is not writable by the application at all: entries
  go into `need_updates` — *voy* (`on_the_way`), *ya ayudé* (`helped`),
  *sigue haciendo falta* (`still_needed`), *no es real* (`not_real`) — and
  `deriveNeedState` (`data/need/need.policy.ts`, the old `sync_need_state`
  trigger as a pure function) derives the status from them. Until 16 August two "ya
  ayudé" from two distinct phones also **closed** the case; that threshold is
  gone, because the premise under it was false — help arriving is not the
  same event as a household no longer needing help, and reading it as one
  took pins off the map over families still waiting. The tally now only ever
  writes `pending`, `on_the_way` or `attended`. What a second "ya ayudé" buys
  is a **colour**: `needRollup` paints a well-attended case green so it stops
  competing with a case nobody has visited, while it stays listed and
  contactable. "Sigue haciendo falta" still outranks every help before it and
  puts the case back to full red (`reopened`). Closing survives only as a
  curator's decision — `closed_completed` and `closed_rejected`, both
  statements somebody is accountable for — and `deriveNeedState` freezes
  every closed state against later entries. If a feature ever needs to set a
  status directly, it is the feature that is wrong.
- **Moving a pin is a neighbour's correction, not a curator's privilege —
  but only inside its own barrio.** Almost every coordinate here is a best
  guess: a form filled in on a street, or a press report geocoded by
  approximation. The person who knows the block is almost never the person
  with an account, so `canRelocate` (in `data/geo/relocation.policy.ts`) lets
  anyone move a `site` or a `need` anywhere inside the barrio it already
  resolves to. A curator moves it anywhere in the covered area; a pin that
  resolves to no barrio at all (Villamaría, where we hold no polygons) has no
  boundary to respect and anyone may move it. Walking a pin across the city
  is the destructive version and is the only thing refused, because the
  barrio drives the panel's filter, the frente weighting and every count
  anyone reads. The barrio is never written by the application — the DAL
  re-derives it from the new point through `resolveNeighborhood`, the same
  call it authorized with, which is what the `*_sets_neighborhood` triggers
  used to guarantee.
- **A contact button never dials.** Every phone number here is invented, and
  an invented Colombian mobile is somebody's real number. The buttons keep
  their place and say what they are — see `DemoContactButton`.
- **Nothing is deleted for being stale.** It is labelled stale and demoted.
  Every perishable row carries `confirmedAt` + `expiresAt`.
- **No literal colours in components.** `bg-pending`, not `bg-red-500`.
- **`components/ui/` is owned by the shadcn and mapcn CLIs.** Editing those
  files loses the change on the next update. Wrap them instead.
- **kebab-case for source files.** Always.

## Resolved versions

Verified against `package.json` on 5 September 2026.

| | |
|---|---|
| Next.js | 16.3.0 |
| React | 19.2.8 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| shadcn CLI | 4.18.0 |
| mapcn | shadcn registry, `@mapcn/map` (pins maplibre-gl to 5.x — see README) |
| maplibre-gl | 5.24.0 |
| Zod | 4.4.3 |
| oxlint | 1.79.0, run type-aware via `oxlint-tsgolint` |

Version-specific things that are easy to get wrong:

- **`middleware.ts` does not exist in Next 16.** The file is `proxy.ts` and
  the export is `proxy`. There is none in this repo — the only thing it did
  was refresh a Supabase session — and having both files would be a build
  error, so add it back only for something that genuinely needs to run on
  every request.
- **PPR is not experimental any more:** `cacheComponents: true`.
  `unstable_cache` is replaced by the `use cache` directive.
- **`public/barrios.geojson` is read from disk at request time.** Nothing
  imports it, so `outputFileTracingIncludes` in `next.config.ts` is what
  keeps it in the deployment. Drop that entry and every pin silently loses
  its barrio in production while working locally.
- **`oxlint --type-aware` needs `oxlint-tsgolint` installed**, not just
  `oxlint` itself — the type-checked rules (`typescript/no-floating-promises`)
  silently refuse to run without it.

## External data

The demo calls exactly one host at runtime, and it is the basemap.

| Source | Gives us | When | Key |
|---|---|---|---|
| CARTO | Basemap tiles (mapcn default) | Every map load | No |
| SIG Alcaldía de Manizales | The barrio polygons and the sector names | Build time, by hand (`scripts/`) | No |
| Wikimedia Commons | The demo's animal photos | Once, committed to `public/mascotas/` | No |

**INVIAS has an API but it does not carry closures** — only the road network.
Daily landslide bulletins, and IDEAM's landslide alerts, are published as PDF,
not an endpoint. This is why road closures are out of scope entirely rather
than a hand-curated table (see below): a stale closure reroutes someone away
from a road that reopened this morning, and maintaining that table by hand was
a standing commitment nobody took. `closed_road` existed briefly and was
dropped on 14 August — do not go looking for it.

## The fixtures, and the seed they are not

`lib/demo/fixtures/*.json` is invented from end to end: names, phones,
addresses, threads. Keep it that way. Two rows carry `published: false` on
purpose — without them the curator's queue is empty and half the product is
invisible.

`supabase/seed.sql` is the opposite and is **not** loaded anywhere: it carries
real names and phone numbers from press reporting, with coordinates its own
header calls approximate and unverified. Do not copy rows from it into a
fixture.

There is no "verificado por un curador" any more, on any table: the column and
the badge were removed on 15 August because this project will not have a
curator team, and a confidence level nobody can ever reach does not read as
"not yet" — it reads as a judgement that was made. What survives is
`confirmed_count` on `sites` (anyone, one tap, no account) and `published`
(hiding spam, which needs no roster).

## Deliberately out of scope

Missing persons (we link to the Red Cross), housing people in strangers' homes,
handling money, offline/PWA, multi-emergency, native apps, internal chat, i18n,
road closures (dropped 14 August — see External data above).

Each of those was decided against for a reason. If one comes back, reopen the
decision explicitly rather than adding it quietly.
