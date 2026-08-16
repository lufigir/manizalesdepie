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

Illegal imports, enforced in `eslint.config.mjs`:

| From | May not import | Why |
|---|---|---|
| `app/`, `components/` | `@/lib/supabase/admin`, `@supabase/supabase-js` | The service-role client bypasses row-level security |
| `app/`, `components/` | `@/lib/env.server` | Server config does not cross into the browser bundle |
| `data/**` except `*.dal.ts` | the admin client | One door to the database, not two |
| `*.policy.ts` | anything with a session or a query | Policies are pure predicates |
| `app/**`, `components/**` (not `ui/`) | literal Tailwind colours | The palette lives in `app/globals.css` |

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
  fields live on `work_order` itself. The reasoning was that the old gate —
  reveal-once, in exchange for an unverified name and phone — protected
  nobody it claimed to while stopping somebody with a volqueta from calling
  to size up a case before committing to it.
  The fields are optional and stay optional. A report is frequently written
  by a neighbour on somebody else's behalf, so the only thing standing
  between an affected person and a published address is the warning in
  `WORK_ORDER_FORM.contactHint`. Weaken that copy and the decision above
  stops being defensible — treat it as load-bearing, not as a nicety.
- **A `work_order` never closes itself. It cools.** Closing was once one
  anonymous tap that wrote a terminal status, so one bad actor could empty
  the map. Since 15 August `status` is not writable by the application at
  all: entries go into `work_order_update` — *voy*, *ya ayudé*, *sigue
  haciendo falta*, *no es real* — and `sync_work_order_state` derives the
  status from them. Until 16 August two "ya ayudé" from two distinct phones
  also **closed** the case; that threshold is gone, because the premise
  under it was false — help arriving is not the same event as a household
  no longer needing help, and reading it as one took pins off the map over
  families still waiting. The tally now only ever writes `unclaimed`,
  `claimed` or `attended`. What a second "ya ayudé" buys is a **colour**:
  `workOrderRollup` paints a well-attended case green so it stops competing
  with a case nobody has visited, while it stays listed and contactable.
  "Sigue haciendo falta" still outranks every help before it and puts the
  case back to full red. Closing survives only as a curator's decision —
  `closed_completed` and `closed_rejected`, both statements somebody is
  accountable for — and `sync_work_order_state` freezes every closed state
  against later entries. If a feature ever needs to set a status directly,
  it is the feature that is wrong.
- **Moving a pin is a neighbour's correction, not a curator's privilege —
  but only inside its own barrio.** Almost every coordinate here is a best
  guess: a form filled in on a street, or a press report geocoded by
  approximation. The person who knows the block is almost never the person
  with an account, so `canRelocate` (in `data/geo/relocation.policy.ts`) lets
  anyone move a `site` or a `work_order` anywhere inside the barrio it
  already resolves to. A curator moves it anywhere in the covered area; a pin
  that resolves to no barrio at all (Villamaría, where we hold no polygons)
  has no boundary to respect and anyone may move it. Walking a pin across the
  city is the destructive version and is the only thing refused, because the
  barrio drives the panel's filter, the frente weighting and every count
  anyone reads. The barrio is never written by the application — the
  `*_sets_neighborhood` triggers re-derive it from the new point, which is
  why `neighborhood_id` stays out of the update.
- **Realtime goes browser → Postgres directly, so RLS is the guard there, not
  the DAL.** Any new sensitive column must live in a table that no channel
  subscribes to. Do not "temporarily" add one to a published table.
- **Nothing is deleted for being stale.** It is labelled stale and demoted.
  Every perishable table carries `confirmed_at` + `expires_at`.
- **No literal colours in components.** `bg-unclaimed`, not `bg-red-500`.
- **`components/ui/` is owned by the shadcn and mapcn CLIs.** Editing those
  files loses the change on the next update. Wrap them instead.
- **kebab-case for source files, snake_case in the database.** Always.

## Resolved versions

Verified against npm and live documentation on 13 August 2026.

| | |
|---|---|
| Next.js | 16.3.0 |
| React | 19.2.8 |
| TypeScript | 5.x (the CLI's pin; 7.0.2 exists but is very new) |
| Tailwind CSS | 4.x |
| shadcn CLI | 4.18.0, preset `nova`, base `radix` |
| mapcn | shadcn registry, `@mapcn/map` |
| maplibre-gl | 6.3.0 |
| @supabase/supabase-js | 2.112.3 |
| @supabase/ssr | 0.12.4 |
| Zod | 4.4.3 |
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
  `site_public` / `work_order_public` views, which project `longitude` and
  `latitude`. Both are declared `security_invoker = on`; without that they
  would bypass every RLS policy.

## External data

| Source | Gives us | Key |
|---|---|---|
| Nominatim | Geocoding an address the user typed | No |
| Overpass | POI suggestions, and the accented spelling of barrio names | No |
| SIG Alcaldía de Manizales | The official barrio polygons (ArcGIS open data) | No |
| SGC | Live aftershocks | No |
| CARTO | Basemap tiles (mapcn default) | No |

**INVIAS has an API but it does not carry closures** — only the road network.
Daily landslide bulletins, and IDEAM's landslide alerts, are published as PDF.
That is why `closed_road` is a hand-curated table and not an integration. Do not
go looking for the endpoint; it isn't there.

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
`confirmed_count` on `site` (anyone, one tap, no account) and `published`
(hiding spam, which needs no roster).

## Deliberately out of scope

Missing persons (we link to the Red Cross), housing people in strangers' homes,
handling money, offline/PWA, multi-emergency, native apps, internal chat, i18n.

Each of those was decided against for a reason. If one comes back, reopen the
decision explicitly rather than adding it quietly.
