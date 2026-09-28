# Manizales de Pie

Live map of earthquake relief for **Manizales and Villamaría** (Caldas,
Colombia), after the magnitude 7.4 event of 10 August 2026.

The product answers one question: **"¿dónde ayudo hoy?"** People want to help
and cannot find out where the help is actually needed today. Everything in this
codebase exists to answer that in the first three seconds.

Conventions, the dependency rule and the guardrails live in [`AGENTS.md`](./AGENTS.md).
Read that before writing code. This file is setup and state.

---

## Getting it running

You need a Supabase project. There is no way around it: the app is a live map
and the database is the map.

```bash
npm install

cp .env.example .env.local     # then fill it in — see below
```

### 1. Supabase project

The project exists: `manizales-de-pie` (ref `lriozoktdpkggzywimek`, region
`us-east-1`), in the **Felipe Giraldo** org — not *Centro de Prototipado*, which
is at the free-tier ceiling of two active projects.

From **Project Settings → API**, copy into `.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Secret (service role) key — **server only** |

`lib/env.ts` validates all of this at load. A missing variable fails the build
rather than surfacing as a null at 3am.

### 2. Schema

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push          # applies supabase/migrations/
```

The migration enables PostGIS, creates nine tables, the `security_invoker`
views, the proximity RPCs and every row-level security policy.

### 3. Seed — read this before publishing anything

```bash
npx supabase db execute --file supabase/seed.sql
```

The seed carries real shelter names and real needs, sourced from press and
institutional reporting.

**The coordinates are approximate and unverified.** Every row is inserted with
`published = false` on purpose. Sending someone to the wrong shelter during an
emergency is worse than having no pin at all, so each row is geocoded and
confirmed before it goes live.

### 4. Google sign-in

In **Authentication → Providers**, enable Google and add
`<your-site>/auth/callback` as a redirect URL. There is no SMS OTP anywhere in
this project: identity comes from a Google account, and a phone number is
declared by the user, not verified.

### 5. Run

```bash
npm run dev
```

---

## What is built

| | |
|---|---|
| ✅ | Database schema: 9 tables, PostGIS, RLS, proximity RPCs, status derived by trigger |
| ✅ | Seed data from the research (unpublished, coordinates unverified) |
| ✅ | Design system: shadcn + mapcn, semantic tokens, triage palette (`pending`/`underway`/`resolved`), dark mode |
| ✅ | Data layer, one module per entity: `data/site/`, `data/need/`, `data/service/`, `data/animal/`, `data/neighborhood/`, `data/geo/` — DTO, policy, DAL, actions |
| ✅ | Auth — Google sign-in, `/auth/login`, `/auth/callback` |
| ✅ | Map page: category chips, markers by type, live "HOY" bar, detail sheets, one-tap confirmation, realtime on `sites` |
| ✅ | `/reportar` — public forms for a site, a need, a service and an animal report, with the 50 m duplicate check on sites (`SiteDAL.findNearby`) |
| ✅ | Neighbour pin relocation, scoped to the barrio (`canRelocate`) |
| ✅ | Curator publish/hide toggles inline on each card (`AdminActions`) — no dedicated `/admin` queue yet |
| ✅ | Security baseline: CSP, `server-only` markers, env split, `ignore-scripts` |
| ✅ | Structured logging with redaction of phones and addresses |
| ✅ | Layer boundaries enforced by ESLint and Oxlint (deny-by-default import rules; see `AGENTS.md`) |

**Verified:** `npx tsc --noEmit`, `npm run lint`, `npm run lint:oxlint` and
`npm run build` all pass clean as of 18 August 2026. The map itself has
**not** been seen rendering with real data — that needs a Supabase project.

## What is next

- **A dedicated `/admin` curation queue.** Publishing and hiding exist as
  per-card actions; there is no single mobile-first screen to triage
  everything unpublished at once, or to merge duplicates.
- **`/reportar` geocoding.** Reports place a pin by dragging the map; there is
  no Nominatim address lookup or Turnstile bot check on the public forms yet.
- **`/bienvenida`** — three mode cards, saved to `localStorage`, skippable.
  Not started.
- **Volunteer calls were built and then removed** (14 August —
  `20260815060000_drop_calls.sql`): recruiting for a shift is a problem
  WhatsApp already solves inside groups people already belong to, and an
  ephemeral call went stale faster than anyone could confirm it. Do not
  re-add this without reopening that decision.

## Known risks, accepted on purpose

- **No offline support.** The documented failure mode of this category of app
  is being useless when the event itself took down the network. This was
  decided against with the evidence on the table.
- **Phone numbers are declared, not verified.** No SMS OTP, because it costs
  money and the project runs on free tiers. A Google account gives traceability,
  and a listing carries the confirmations neighbours leave on it.
- **The name excludes Villamaría**, which also has casualties and displaced
  families.
- **Free tier under load.** If this catches on, the ceiling arrives at the worst
  possible moment. Escape route: Supabase Pro.
- **mapcn pins maplibre-gl to v5.** v6 removed the default export that
  `components/ui/map.tsx` imports; the build fails on v6. Do not upgrade until
  mapcn does.
