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

## Open debt: a rename migration is written but NOT applied

`supabase/migrations/20260818090000_contract_drop_legacy_names.sql` exists in
the repo and has **not** been run against the database. Every table went
plural on 18 August (`sites`, `site_items`, `site_confirmations`, `needs`,
`need_updates`, `services`, `animal_reports`, `neighborhoods`, `profiles`),
and the code in this repo already talks to the plural tables and the
`*_public` views built on them. What keeps a still-deployed build of the old
code alive during the rollout is 14 compatibility views under the old
singular names (`site`, `need`, `work_order`, `confirmation`, …) plus their
own `*_public` wrappers — see `20260818030000_expand_plural_names.sql`.

Applying the contract migration drops all 14 of those views, drops the
redundant `needs.state` column, and drops the dead `entity`/`entity_id`
columns on `site_confirmations`. **Do this only after the plural-named code
in this repo is confirmed running in production** — applying it earlier
takes down whatever old build is still receiving traffic. If you are looking
for the compatibility views and cannot find them, this is why: check whether
the contract migration has already run before assuming they were never
there.

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
- `data/` is the only path to the database. **No Supabase query in a page, a
  component, a route handler, or an action.** A Server Component importing a
  DAL is correct; that is the intended path.
- `lib/` holds shared plumbing: clients, config, logging, labels.

Illegal imports, enforced in `eslint.config.mjs` and mirrored in
`oxlint.config.ts`:

| From | May not import | Why |
|---|---|---|
| `app/`, `components/` | any `@/lib/supabase/*` client, `@supabase/supabase-js` | The service-role client bypasses row-level security; every other client belongs behind a DAL. `map-workspace.tsx` (realtime) and the auth session (`app/auth/**`) are the two named exceptions — see `eslint.config.mjs`. |
| `app/`, `components/` | `@/lib/env.server` | Server config does not cross into the browser bundle |
| `data/**` except `*.dal.ts` | any `@/lib/supabase/*` client, `@supabase/supabase-js` | One door to the database, not two. `data/user/require-user.ts` is the one named exception: it resolves the session every DAL factory needs before it can build its authorization context. |
| `*.policy.ts` | anything with a session or a query | Policies are pure predicates |
| `app/**`, `components/**` (not `ui/`) | literal Tailwind colours | The palette lives in `app/globals.css` |

Both configs deny by default: an import path is blocked unless it matches a
`!`-negated exception written into the pattern. A new file under
`lib/supabase/` or a new database vendor is unreachable from `app/` or
`data/**` the moment it exists, not just after someone remembers to add it to
a list.

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
   call it, revalidate.

Copy the shape of `data/site/` exactly. It is the reference implementation.

**Order inside every mutation, no exceptions:** validate input → authorize →
mutate → validate output. Map rows to DTOs explicitly; never spread a database
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
  `sync_need_state` derives the status from them. Until 16 August two "ya
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
  statements somebody is accountable for — and `sync_need_state` freezes
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
  anyone reads. The barrio is never written by the application — the
  `*_sets_neighborhood` triggers re-derive it from the new point, which is
  why `neighborhood_id` stays out of the update.
- **Realtime goes browser → Postgres directly, so RLS is the guard there, not
  the DAL.** `sites` is the only table published to a realtime channel — see
  `map-workspace.tsx`. Any new sensitive column must live in a table that no
  channel subscribes to. Do not "temporarily" add one to a published table.
- **Nothing is deleted for being stale.** It is labelled stale and demoted.
  Every perishable table carries `confirmed_at` + `expires_at`.
- **No literal colours in components.** `bg-pending`, not `bg-red-500`.
- **`components/ui/` is owned by the shadcn and mapcn CLIs.** Editing those
  files loses the change on the next update. Wrap them instead.
- **kebab-case for source files, snake_case in the database.** Always.

## Resolved versions

Verified against `package.json` on 18 August 2026.

| | |
|---|---|
| Next.js | 16.3.0 |
| React | 19.2.8 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| shadcn CLI | 4.18.0 |
| mapcn | shadcn registry, `@mapcn/map` (pins maplibre-gl to 5.x — see README) |
| maplibre-gl | 5.24.0 |
| @supabase/supabase-js | 2.112.3 |
| @supabase/ssr | 0.12.4 |
| Zod | 4.4.3 |
| oxlint | 1.79.0, run type-aware via `oxlint-tsgolint` |
| PostGIS | Supabase extension |

Version-specific things that are easy to get wrong:

- **`middleware.ts` does not exist in Next 16.** The file is `proxy.ts`, the
  export is `proxy`, the runtime is Node and cannot be configured. Having both
  files is a build error. Supabase's own docs still say `middleware.ts`; the
  pattern is right, the filename is stale.
- **Session refresh is `supabase.auth.getClaims()`**, called early, before the
  response is committed. Later than that and the refreshed cookie is lost.
- **PPR is not experimental any more:** `cacheComponents: true`.
  `unstable_cache` is replaced by the `use cache` directive.
- **PostGIS columns serialise as WKB hex through PostgREST.** Read through the
  `sites_public` / `needs_public` / `services_public` / `animal_reports_public`
  / `neighborhoods_public` / `need_updates_public` views, which project
  `longitude` and `latitude`. All are declared `security_invoker = on`;
  without that they would bypass every RLS policy.
- **`oxlint --type-aware` needs `oxlint-tsgolint` installed**, not just
  `oxlint` itself — the type-checked rules (`typescript/no-floating-promises`)
  silently refuse to run without it.

## External data

| Source | Gives us | Key |
|---|---|---|
| Nominatim | Geocoding an address the user typed | No |
| Overpass | POI suggestions, and the accented spelling of barrio names | No |
| SIG Alcaldía de Manizales | The official barrio polygons (ArcGIS open data) | No |
| SGC | Live aftershocks | No |
| CARTO | Basemap tiles (mapcn default) | No |

**INVIAS has an API but it does not carry closures** — only the road network.
Daily landslide bulletins, and IDEAM's landslide alerts, are published as PDF,
not an endpoint. This is why road closures are out of scope entirely rather
than a hand-curated table (see below): a stale closure reroutes someone away
from a road that reopened this morning, and maintaining that table by hand was
a standing commitment nobody took. `closed_road` existed briefly and was
dropped on 14 August — do not go looking for it.

## Seed data warning

`supabase/seed.sql` carries real names, needs and closures from press reporting,
but **the coordinates are approximate and unverified**. Everything is seeded
`published = false` on purpose. Somebody geocodes and confirms each row before
it becomes visible. Sending someone to the wrong shelter is worse than having no
pin at all.

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
