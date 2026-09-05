import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { contains } from "@/lib/geo";

import animalsFixture from "./fixtures/animals.json";
import needsFixture from "./fixtures/needs.json";
import sectorsFixture from "./fixtures/sectors.json";
import servicesFixture from "./fixtures/services.json";
import sitesFixture from "./fixtures/sites.json";

/**
 * The database, for a demo that no longer has one.
 *
 * This project ran on Postgres — 36 migrations of it, row-level security,
 * PostGIS, triggers that derived a case's state from its own thread. That
 * schema is still in `supabase/`, and the reason it is not running is written
 * in the README: the emergency it was built for is over and the map is now a
 * portfolio piece, so it pays for no infrastructure.
 *
 * What replaces it is this file plus the JSON beside it: a fixed snapshot of
 * invented reports, read at request time. Everything the database used to
 * compute on the way out is computed here instead — the barrio a coordinate
 * falls in (a trigger calling PostGIS), the distance between two points, the
 * freshness clocks — so a DAL above still asks for rows and gets rows.
 *
 * Only a `*.dal.ts` file may import it, exactly as only a DAL could import a
 * Supabase client before. The rule is the same rule and it is still enforced
 * in `eslint.config.mjs`; only the thing behind the door changed.
 */

// --------------------------------------------------------------- time ----

/**
 * Timestamps are stored as an age, never as a date.
 *
 * A fixture with absolute dates in it is a demo that reads "hace 3 días" for
 * one week and "hace 8 meses" forever after, with every pin sunk to the
 * bottom of a feed that sorts by freshness. Storing "18 hours ago" and
 * resolving it against the clock keeps the map looking like what it depicts —
 * a city in the middle of an emergency — on whatever day somebody opens it.
 */
function agoISO(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function aheadISO(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

// ----------------------------------------------------------------- ids ----

/**
 * A stable uuid for a fixture row, derived from its slug.
 *
 * The rows are authored with readable slugs (`site-coliseo-mayor`) because a
 * hand-written uuid is a hand-written mistake, but the DTOs demand uuids and
 * the ids end up in shareable URLs — so a link to a case has to survive a
 * redeploy. Hashing the slug gives both: readable source, stable identity.
 *
 * Version 5's own shape (namespace + name, SHA-1, version and variant bits
 * stamped in), with a fixed namespace of our own.
 */
const NAMESPACE = "manizales-de-pie/demo";

export function demoId(slug: string): string {
  const hash = createHash("sha1").update(`${NAMESPACE}:${slug}`).digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

// --------------------------------------------------------------- geo ------

type Ring = [number, number][];

type BarrioFeature = {
  properties: { name: string; lon: number; lat: number };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] };
};

/**
 * The 114 official barrio polygons, read off the same file the browser
 * downloads to draw the outlines. One copy, two readers.
 *
 * `next.config.ts` names it in `outputFileTracingIncludes`: nothing imports
 * it, so the tracer cannot know a server render needs it, and a missing
 * boundary file would silently turn every barrio into "no barrio".
 */
const barrios: BarrioFeature[] = JSON.parse(
  readFileSync(join(process.cwd(), "public", "barrios.geojson"), "utf8"),
).features;

export type DemoNeighborhood = {
  id: string;
  name: string;
  municipality: "manizales" | "villamaria";
  longitude: number;
  latitude: number;
  parentName: string | null;
};

/**
 * Every barrio with a polygon, plus the 178 sectores that have none.
 *
 * The split is the one the database drew: a barrio is a shape, a sector is a
 * name people use inside one — "Topacio", not "Morrogacho" — with no geometry
 * published anywhere, so it borrows its parent's centroid and can never be
 * what a coordinate resolves to. `neighborhoodAt` only ever consults the
 * polygons, which is what keeps that true here too.
 */
export function neighborhoods(): DemoNeighborhood[] {
  const rows: DemoNeighborhood[] = barrios.map((feature) => ({
    id: demoId(`barrio-${feature.properties.name}`),
    name: feature.properties.name,
    municipality: "manizales" as const,
    longitude: feature.properties.lon,
    latitude: feature.properties.lat,
    parentName: null,
  }));

  const byName = new Map(rows.map((row) => [row.name, row]));

  for (const sector of sectorsFixture) {
    const parent = byName.get(sector.parent);
    if (!parent) continue;

    rows.push({
      id: demoId(`sector-${sector.name}`),
      name: sector.name,
      municipality: "manizales",
      longitude: parent.longitude,
      latitude: parent.latitude,
      parentName: parent.name,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Which barrio a coordinate falls in, or null outside every polygon we hold
 *  — the whole of Villamaría, among other places. The demo's stand-in for the
 *  `neighborhood_at` PostGIS function the insert triggers used to call. */
export function neighborhoodAt(
  longitude: number,
  latitude: number,
): { id: string; name: string } | null {
  for (const feature of barrios) {
    if (contains(feature.geometry, longitude, latitude)) {
      return {
        id: demoId(`barrio-${feature.properties.name}`),
        name: feature.properties.name,
      };
    }
  }

  return null;
}

/** Metres between two coordinates, by the haversine formula. What the PostGIS
 *  `<->` operator answered for "is there already a pin 30 m from here". */
export function distanceMeters(
  aLon: number,
  aLat: number,
  bLon: number,
  bLat: number,
): number {
  const R = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function barrioName(longitude: number, latitude: number): string | null {
  return neighborhoodAt(longitude, latitude)?.name ?? null;
}

// -------------------------------------------------------------- rows ------

export type SiteRow = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  address: string | null;
  longitude: number;
  latitude: number;
  neighborhood: string | null;
  status: string;
  schedule: string | null;
  whatsapp: string | null;
  confirmedCount: number;
  confirmedAt: string;
  expiresAt: string;
  items: { id: string; label: string; mode: string; priority: number }[];
  published: boolean;
};

export function sites(): SiteRow[] {
  return sitesFixture.map((row) => ({
    id: demoId(row.slug),
    type: row.type,
    name: row.name,
    description: row.description ?? null,
    address: row.address ?? null,
    longitude: row.longitude,
    latitude: row.latitude,
    // Stamped from the point, never authored: the same thing the
    // `site_sets_neighborhood` trigger did, so a fixture cannot claim a
    // barrio its coordinate does not fall in.
    neighborhood: barrioName(row.longitude, row.latitude),
    status: row.status,
    schedule: row.schedule ?? null,
    whatsapp: row.whatsapp ?? null,
    confirmedCount: row.confirmedCount,
    confirmedAt: agoISO(row.confirmedHoursAgo),
    expiresAt: aheadISO(row.expiresInHours),
    items: (row.items ?? []).map((item, index) => ({
      id: demoId(`${row.slug}-item-${index}`),
      label: item.label,
      mode: item.mode,
      priority: item.priority,
    })),
    published: row.published,
  }));
}

export type NeedUpdateRow = {
  id: string;
  needId: string;
  kind: string;
  name: string | null;
  phone: string | null;
  note: string;
  createdAt: string;
};

export type NeedRow = {
  id: string;
  category: string;
  description: string;
  longitude: number;
  latitude: number;
  neighborhood: string | null;
  exactAddress: string | null;
  contactName: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  published: boolean;
  /** Every entry in the case's book. The status, the two counters and
   *  `reopened` are derived from these by `deriveNeedState`, never stored —
   *  the same shape the `sync_need_state` trigger enforced. */
  updates: NeedUpdateRow[];
  /** A curator's verdict, the one state a tally cannot reach. */
  closedStatus: "closed_completed" | "closed_rejected" | null;
};

export function needs(): NeedRow[] {
  return needsFixture.map((row) => {
    const id = demoId(row.slug);

    return {
      id,
      category: row.category,
      description: row.description,
      longitude: row.longitude,
      latitude: row.latitude,
      neighborhood: barrioName(row.longitude, row.latitude),
      exactAddress: row.exactAddress ?? null,
      contactName: row.contactName ?? null,
      phone: row.phone ?? null,
      notes: row.notes ?? null,
      createdAt: agoISO(row.createdHoursAgo),
      published: row.published,
      updates: (row.updates ?? []).map((update, index) => ({
        id: demoId(`${row.slug}-update-${index}`),
        needId: id,
        kind: update.kind,
        name: update.name ?? null,
        phone: update.phone ?? null,
        note: update.note,
        createdAt: agoISO(update.hoursAgo),
      })),
      closedStatus:
        (row.closedStatus as NeedRow["closedStatus"] | undefined) ?? null,
    };
  });
}

export type ServiceRow = {
  id: string;
  type: string;
  description: string;
  area: string | null;
  longitude: number | null;
  latitude: number | null;
  neighborhood: string | null;
  whatsapp: string;
  confirmedAt: string;
  expiresAt: string;
  published: boolean;
};

export function services(): ServiceRow[] {
  return servicesFixture.map((row) => ({
    id: demoId(row.slug),
    type: row.type,
    description: row.description,
    area: row.area ?? null,
    longitude: row.longitude ?? null,
    latitude: row.latitude ?? null,
    neighborhood:
      row.longitude != null && row.latitude != null
        ? barrioName(row.longitude, row.latitude)
        : null,
    whatsapp: row.whatsapp,
    confirmedAt: agoISO(row.confirmedHoursAgo),
    expiresAt: aheadISO(row.expiresInHours),
    published: row.published,
  }));
}

export type AnimalRow = {
  id: string;
  kind: string;
  species: string;
  petName: string | null;
  description: string;
  photoUrl: string | null;
  lastSeenAt: string;
  longitude: number | null;
  latitude: number | null;
  zone: string | null;
  whatsapp: string;
  resolvedAt: string | null;
  confirmedAt: string;
  published: boolean;
};

export function animals(): AnimalRow[] {
  return animalsFixture.map((row) => ({
    id: demoId(row.slug),
    kind: row.kind,
    species: row.species,
    petName: row.petName ?? null,
    description: row.description,
    // A path under /public rather than a bucket URL. The photos are free
    // licence, committed with the repo — see README.
    photoUrl: row.photo ?? null,
    lastSeenAt: agoISO(row.lastSeenHoursAgo),
    longitude: row.longitude ?? null,
    latitude: row.latitude ?? null,
    zone: row.zone ?? null,
    whatsapp: row.whatsapp,
    resolvedAt:
      row.resolvedHoursAgo === undefined ? null : agoISO(row.resolvedHoursAgo),
    confirmedAt: agoISO(row.confirmedHoursAgo),
    published: row.published,
  }));
}
