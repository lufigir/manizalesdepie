/**
 * Narrows the OSM health import to general hospitals.
 *
 * Run by hand: `node --env-file=.env.local scripts/prune-osm-sites.mjs`
 *
 * The first import asked Overpass for amenity in (hospital, clinic, doctors),
 * which swept in dental surgeries, an eye institute, a pathology lab, insurer
 * offices and a rehabilitation centre — 39 pins where a dozen were useful. None
 * of them help someone hurt in an earthquake, and burying the ones that do
 * under the ones that don't is exactly the directory failure AGENTS.md warns
 * about.
 *
 * `amenity=hospital` is the tag for a facility with inpatient care; `clinic`
 * and `doctors` are outpatient and specialist practices. That single tag is the
 * line between "somewhere to take an injured person" and "a phone book".
 *
 * Only OSM-sourced rows are ever touched. Anything a person reported, or that
 * came from the press, is left alone regardless of type.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Corre con: node --env-file=.env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });

const QUERY = `
[out:json][timeout:180];
(
  area["name"="Manizales"]["boundary"="administrative"]["admin_level"="6"];
  area["name"="Villamaría"]["boundary"="administrative"]["admin_level"="6"];
)->.a;
nwr(area.a)["amenity"="hospital"];
out ids;
`;

const response = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: {
    "User-Agent": "manizales-de-pie/1.0 (https://manizales-de-pie.vercel.app)",
  },
  body: new URLSearchParams({ data: QUERY }),
});
if (!response.ok) throw new Error(`Overpass respondió ${response.status}`);

const { elements } = await response.json();
const hospitals = new Set(
  elements.map((el) => `https://www.openstreetmap.org/${el.type}/${el.id}`),
);

const { data: sites, error } = await supabase
  .from("sites")
  .select("id, name, type, source_url, status")
  .like("source_url", "https://www.openstreetmap.org/%");

if (error) throw new Error(`No se pudo leer sites: ${error.message}`);

const drop = sites.filter((s) => {
  if (s.type !== "medical_post") return false;
  // Press-confirmed as operating: that report is worth more than the OSM tag.
  if (s.status === "open") return false;
  return !hospitals.has(s.source_url);
});

if (drop.length === 0) {
  console.log("Nada que podar.");
  process.exit(0);
}

const { error: deleteError } = await supabase
  .from("sites")
  .delete()
  .in(
    "id",
    drop.map((s) => s.id),
  );
if (deleteError) throw new Error(`Fallo al borrar: ${deleteError.message}`);

console.log(`${hospitals.size} hospitales en OSM · ${drop.length} pines retirados\n`);
for (const s of drop) console.log(`  − ${s.name}`);

const { count } = await supabase
  .from("sites")
  .select("*", { count: "exact", head: true })
  .eq("published", true);
console.log(`\nQuedan ${count} puntos publicados.`);
