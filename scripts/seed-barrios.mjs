/**
 * Loads public/barrios.geojson into the `neighborhood` table.
 *
 * Run after `node scripts/fetch-barrios.mjs`, and again whenever the Alcaldía
 * updates the layer:
 *
 *   node scripts/seed-barrios.mjs
 *
 * Why a script and not a migration: a migration is applied once and never
 * revisited, so editing it after the source changes would leave every database
 * that already ran it untouched. This is idempotent — it upserts on
 * (name, municipality) — and is meant to be re-run.
 *
 * It writes through `upsert_neighborhood`, the same shape as every other write
 * in this project: one named function, called with the service role. The 145 KB
 * of geometry never travels as raw SQL.
 *
 * Reads SUPABASE_SECRET_KEY from .env.local. That key bypasses row-level
 * security, which is exactly why this file lives in scripts/ and never in app/.
 */

import { readFile } from "node:fs/promises";

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      const value = line.slice(at + 1).trim();
      return [
        line.slice(0, at).trim(),
        // Values may or may not be quoted; both are valid in a .env file.
        value.replace(/^["']|["']$/g, ""),
      ];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
}

async function rpc(name, body) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${name}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

const { features } = JSON.parse(await readFile("public/barrios.geojson", "utf8"));

let done = 0;
for (const feature of features) {
  await rpc("upsert_neighborhood", {
    p_name: feature.properties.name,
    p_comuna: feature.properties.comuna,
    p_geojson: JSON.stringify(feature.geometry),
  });
  done += 1;
  if (done % 20 === 0) console.log(`  ${done}/${features.length}`);
}

console.log(`${done} barrios cargados`);

// Rows created before the trigger existed carry no barrio. Stamping them is the
// whole point: three of the seven published points say nothing about where they
// are, and "Coliseo Menor, Palogrande" is the version that gets someone there.
const stamped = await rpc("backfill_neighborhoods", {});
console.log(`${stamped} puntos re-etiquetados con su barrio`);
