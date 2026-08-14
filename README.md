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

`NEXT_PUBLIC_CURATOR_WHATSAPP` is the number curators staff, digits only with
the country code (`57` for Colombia). It is shown across the whole app because
the people who lost their homes are not the ones using it.

`lib/env.ts` validates all of this at load. A missing variable fails the build
rather than surfacing as a null at 3am.

### 2. Schema

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push          # applies supabase/migrations/
```

The migration enables PostGIS, creates eleven tables, the `security_invoker`
views, the proximity RPCs and every row-level security policy.

### 3. Seed — read this before publishing anything

```bash
npx supabase db execute --file supabase/seed.sql
```

The seed carries real shelter names, real needs, real road closures and the
real blood-type urgency, all sourced from press and institutional reporting.

**The coordinates are approximate and unverified.** Every row is inserted with
`published = false` on purpose. Sending someone to the wrong shelter during an
emergency is worse than having no pin at all, so a curator must geocode and
confirm each row before it goes live.

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
| ✅ | Database schema: 11 tables, PostGIS, RLS, proximity RPCs, stale-claim release |
| ✅ | Seed data from the research (unpublished, coordinates unverified) |
| ✅ | Design system: shadcn + mapcn, semantic tokens, triage palette, dark mode |
| ✅ | Data layer reference implementation: `data/site/` — DTO, policy, DAL, actions |
| ✅ | Map page: category chips, markers by type, live "HOY" bar, detail sheet, one-tap confirmation |
| ✅ | Security baseline: CSP, `server-only` markers, env split, `ignore-scripts` |
| ✅ | Structured logging with redaction of phones and addresses |
| ✅ | Layer boundaries enforced by lint |

**Verified:** `npm run build` and `npm run lint` both pass clean. The layout,
the 404 and the error boundary render. The map itself has **not** been seen
rendering with real data — that needs a Supabase project.

## What is next, in order

Each of these copies the shape of `data/site/`. Do them in this order; each one
stands on a product that already works.

1. **Auth** — `/auth/login` (Google), `/auth/callback` route handler. Nothing
   below can be tested without it.
2. **`/admin` curation queue** — the highest-leverage screen in the project.
   Approve, reject, edit, verify, merge duplicates. Mobile-first: a curator
   works from a phone. Without this, nothing ever gets published.
3. **`data/work-order/`** — the claim flow. Colour-coded triage, 48-hour
   automatic release, `work_order_contact` revealed only to the claimant and
   written to `work_order_access`. This is the delicate one; re-read the
   guardrails in `AGENTS.md` first.
4. **`data/volunteer-call/`** — ephemeral calls with slots. This is the "¿dónde
   ayudo hoy?" payload; the HOY bar becomes real here.
5. **`/bienvenida`** — the three mode cards, saved to `localStorage`, skippable.
   Worth doing only once there are three genuinely different things to filter.
6. **`/reportar`** — public form with Turnstile, Nominatim geocoding, and the
   50 m duplicate check calling `SiteDAL.findNearby`.
7. **`data/resource-offer/`** — trucks, tools, free transport. No housing.
8. **Road-closure layer** — hand-curated; the INVIAS API does not carry
   closures, only the road network.
9. **`pg_cron`** for `release_stale_claims()` and for expiring stale rows.

## Known risks, accepted on purpose

- **No offline support.** The documented failure mode of this category of app
  is being useless when the event itself took down the network. This was
  decided against with the evidence on the table.
- **Phone numbers are declared, not verified.** No SMS OTP, because it costs
  money and the project runs on free tiers. A Google account gives traceability;
  a curator calls before verifying a listing.
- **The name excludes Villamaría**, which also has casualties and displaced
  families.
- **Free tier under load.** If this catches on, the ceiling arrives at the worst
  possible moment. Escape route: Supabase Pro.
- **mapcn pins maplibre-gl to v5.** v6 removed the default export that
  `components/ui/map.tsx` imports; the build fails on v6. Do not upgrade until
  mapcn does.
