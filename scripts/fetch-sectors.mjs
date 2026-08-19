/**
 * Builds supabase/sectors.sql from the Alcaldía's own "nomenclatura" table.
 *
 * Run by hand, output committed: `node scripts/fetch-sectors.mjs`
 *
 * The source is "Nomenclatura de barrios y sectores del Municipio de
 * Manizales", published by the same SIG Alcaldía de Manizales on its ArcGIS
 * open-data portal that supplies fetch-barrios.mjs — but this dataset is a
 * table, not a layer: every one of its 297 rows carries `geometry: null`.
 * There is nothing here to draw. It exists to answer a narrower question than
 * fetch-barrios.mjs does: not "where is the line", but "what does someone
 * standing here call this place", and the answer goes one level finer than a
 * barrio. Manizales does not say "Villapilar", it says "Venecia" or
 * "Aquilino Villegas"; it does not say "Morrogacho", it says "Topacio". Those
 * are sectors — real, named, used in reports — living inside a barrio that
 * does have a polygon, and until this script ran the report forms had no way
 * to offer them.
 *
 * Same reasons as fetch-barrios.mjs for a build-time script and a committed
 * SQL file instead of a table fetched at request time: this nomenclature does
 * not move, and this is an emergency map that should not depend on a third
 * party answering on every page load. See that file for the fuller argument;
 * it is not repeated here.
 *
 * The `código` column is the whole structure. It is a five-digit number: a
 * row whose code ends in "00" is one of the 114 official barrios (matched
 * one-to-one against public/barrios.geojson, which already carries the real
 * shape); a row whose code does not is a sector, and its parent's code is
 * `Math.floor(código / 100) * 100`. That parent code is the only geometry a
 * sector ever gets — the row inherits the parent's centroid wholesale, never
 * a synthesised point of its own. See supabase/sectors.sql's header for why
 * that borrowed centroid is still honest and not a precision it does not
 * have.
 */

import { readFile, writeFile } from "node:fs/promises";

const SOURCE =
  "https://opendata.arcgis.com/datasets/b4a590d75b8642ed8eedaea0c2279739_0.geojson";

/**
 * The source is served as UTF-8 JSON, but the text inside it was pushed
 * through CP437 and read back as Windows-1252 at some earlier stage on the
 * Alcaldía's side, which is why "Ñ" arrives as "¥" and "é" arrives as "‚".
 * This is the complete, verified set of characters that turn up in the
 * `nombre` field — nowhere else in this script is decoded, because nowhere
 * else is read.
 *
 * Deliberately a closed map, not a general CP437 decoder: a source that
 * silently changes encoding produces invented names, and a barrio picker
 * that offers an invented name is worse than one that offers fewer names.
 * `fixEncoding` below throws on anything not listed here rather than passing
 * it through, on purpose.
 */
const MOJIBAKE = new Map([
  ["¥", "Ñ"], // ¥
  ["¢", "ó"], // ¢
  ["", "è"], // Š (never observed in `nombre`; kept because it is verified)
  ["¡", "í"], // ¡
  [" ", "á"], // nbsp
  ["¤", "ñ"], // ¤
  ["£", "ú"], // £
  ["‚", "é"], // ‚
]);

function fixEncoding(raw) {
  let out = "";
  for (const char of raw) {
    if (char.codePointAt(0) < 128) {
      out += char;
      continue;
    }
    const fixed = MOJIBAKE.get(char);
    if (fixed === undefined) {
      throw new Error(
        `Carácter no mapeado U+${char.codePointAt(0).toString(16)} en "${raw}". ` +
          "La fuente cambió de codificación; no se adivina, se arregla el mapa a mano.",
      );
    }
    out += fixed;
  }
  return out;
}

/** Accent- and case-insensitive key, same normalisation as fetch-barrios.mjs,
 *  so a parent's raw "BELLA MONTAÑA" finds our geojson's "Bella Montaña". */
const key = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/**
 * Parents whose fixed, normalised name still does not find a match in
 * public/barrios.geojson, keyed the same way. Six rows, not the seven the
 * source actually disagrees with us on — "BELLA MONTA¥A" becomes "Bella
 * Montaña" the moment `fixEncoding` runs and needs no alias.
 *
 * "BUENA ESPERANZA" -> "Buena Espernza" is not a fix, it is a mirror: the
 * transposed "rn"/"nz" typo is already live in public/barrios.geojson and in
 * every `neighborhood` row seeded from it, because it is what SIG Alcaldía
 * itself published for "Límite de barrios". Correcting it here, in only one
 * of the two datasets that use it, would break the join instead of fixing
 * the typo — the barrio would still read "Buena Espernza" everywhere else on
 * the map. The alias exists to keep the two sources pointed at the same
 * wrong-but-shared name, not to launder it.
 */
const PARENT_ALIASES = new Map([
  [key("LEONORA"), key("La Leonora")],
  [key("BUENA ESPERANZA"), key("Buena Espernza")],
  [key("PORVENIR"), key("El Porvenir")],
  [key("SANCANCIO"), key("San Cancio")],
  [key("EL PRADO"), key("Prado")],
  [key("PUERTA DEL SOL"), key("Puerta del Sol (Corinto)")],
]);

/**
 * Fragments of the cadastre, not places anyone names to say where they are.
 * "Parte del Ecoparque los Yarumos" turns up three times (La Carola,
 * Porvenir, Sinaí) and "Parte del Ecoparque" once (Viveros): the same public
 * park cut across several barrios' boundaries and re-listed under each one.
 * Offering four near-identical "part of the park" options in a barrio picker
 * would not help anyone report where they are.
 */
const isExcluded = (name) => /^Parte del? /.test(name);

const response = await fetch(SOURCE, {
  headers: { "User-Agent": "manizales-de-pie/1.0" },
});
if (!response.ok) {
  throw new Error(`SIG Manizales (nomenclatura) respondió ${response.status}`);
}

const source = await response.json();
if (!Array.isArray(source.features) || source.features.length === 0) {
  throw new Error("El servicio no devolvió filas; ¿cambió la capa?");
}

const rows = source.features
  .map((f) => f.properties)
  // One row in this dataset is pure garbage — every field, código included,
  // is null. Everything else here has a real code.
  .filter((p) => p.código != null);

const parentRows = rows.filter((r) => r.código % 100 === 0);
const childRows = rows.filter((r) => r.código % 100 !== 0);

const barrios = JSON.parse(await readFile("public/barrios.geojson", "utf8"));
const barrioByKey = new Map(
  barrios.features.map((f) => [key(f.properties.name), f.properties.name]),
);

// código (parent) -> our geojson's spelling of that barrio, or undefined
// when nothing matches even after the alias table.
const parentNameByCode = new Map();
const unmatchedParents = [];

for (const row of parentRows) {
  const fixed = fixEncoding(row.nombre.trim());
  const normalised = key(fixed);
  const resolved =
    barrioByKey.get(normalised) ??
    barrioByKey.get(PARENT_ALIASES.get(normalised) ?? "");

  if (resolved) {
    parentNameByCode.set(row.código, resolved);
  } else {
    unmatchedParents.push(fixed);
  }
}

if (unmatchedParents.length > 0) {
  console.warn(
    `${unmatchedParents.length} barrio(s) de la nomenclatura sin polígono ` +
      `— sus sectores se saltan:\n  ${unmatchedParents.join("\n  ")}`,
  );
}

// código -> raw child row, so orphans (parent absent from the source) can be
// told apart from parents that exist but never matched a polygon.
const parentCodeExists = new Set(parentRows.map((r) => r.código));

/**
 * Two códigos the source gets wrong, corrected by hand.
 *
 * `121001 Samaria` and `121002 Portón del Guamo` read as "comuna 12, barrio
 * 10", and comuna 12 has no barrio 10: its barrios are 1201 Solferino, 1202
 * La Carola, 1203 Villahermosa, 1204 Comuneros, 1205 Porvenir and 1206 Sinaí,
 * which is exactly the six polygons we hold for it. So the código cannot be
 * read literally — the third and fourth digits are transposed and it should
 * be `1201`, Solferino.
 *
 * Three more things agree with that reading, which is why this is a
 * correction and not a guess. Both rows sit immediately after `120100
 * SOLFERINO` in source order. Solferino is otherwise the only barrio in the
 * comuna with no sectors at all. And Samaria already turns up by name in a
 * reported case whose coordinate falls inside the Solferino polygon — the
 * ground agreeing with the paperwork.
 *
 * Keyed by the sector's own código rather than by the broken parent code, so
 * that if the Alcaldía ever publishes a genuine `121000` barrio this map does
 * not silently swallow its sectors too.
 */
const CODE_FIXES = new Map([
  [121001, 120100],
  [121002, 120100],
]);

const skipped = { excluded: [], orphaned: [], unmatchedParent: [] };
const sectors = [];

for (const row of childRows) {
  const fixed = fixEncoding(row.nombre.trim());

  if (isExcluded(fixed)) {
    skipped.excluded.push(fixed);
    continue;
  }

  const parentCode =
    CODE_FIXES.get(row.código) ?? Math.floor(row.código / 100) * 100;

  if (!parentCodeExists.has(parentCode)) {
    // A sector whose parent barrio is absent from the source entirely. None
    // today — the only two that were, are corrected in `CODE_FIXES` above —
    // but the source is re-fetched, so this stays as the honest outcome for
    // the next gap: reported, and skipped rather than given an invented
    // parent.
    skipped.orphaned.push(fixed);
    continue;
  }

  const parentName = parentNameByCode.get(parentCode);
  if (!parentName) {
    // The parent exists in the source but never matched a polygon above.
    skipped.unmatchedParent.push(fixed);
    continue;
  }

  sectors.push({ name: fixed, parentName });
}

// ---------------------------------------------------------- collisions ----
//
// `neighborhood` has a unique (name, municipality) index. Two kinds of
// collision are real here: a sector sharing its name with a polygon-bearing
// barrio ("Sierra Morena" is both the Estrada sector and, independently nowhere
// in our data — checked below against the barrio list), and two sectors under
// different barrios sharing a name ("San Luis" in both Villapilar and
// Kennedy). Computed from the data, not hard-coded, because the source can
// add or rename rows and a hard-coded list would silently go stale.
const occurrences = new Map();
const bump = (name) => occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
for (const name of barrioByKey.values()) bump(name);
for (const sector of sectors) bump(sector.name);

const finalSectors = sectors.map((sector) => {
  const collides = occurrences.get(sector.name) > 1;
  return {
    name: collides ? `${sector.name} (${sector.parentName})` : sector.name,
    parentName: sector.parentName,
  };
});

// ------------------------------------------------------------- the file ----
//
// Same shape as fetch-barrios.mjs's supabase/barrios.sql: an idempotent
// upsert, matched on (name, municipality), meant to be re-run whenever the
// Alcaldía's nomenclature changes rather than replayed as a migration.
const sql = [
  "-- GENERATED by scripts/fetch-sectors.mjs — do not edit by hand.",
  '-- Source: SIG Alcaldía de Manizales, tabla "Nomenclatura de barrios y',
  "-- sectores\" (no geometry — see this file's own header and the migration",
  "-- that added `parent_id` for why). Re-run the script to refresh.",
  "--",
  "--   npx supabase db execute --file supabase/sectors.sql",
  "--",
  "-- Every sector below inherits its parent barrio's centroid, on purpose:",
  "-- this source carries no coordinates of its own, the picker only uses the",
  "-- centroid to frame the camera before the reporter drags the pin to the",
  "-- real spot, and the barrio that actually gets saved is decided by that",
  "-- dragged point through the `*_sets_neighborhood` triggers — never by this",
  "-- row. Inventing a tighter coordinate than the source has would be a",
  "-- precision this project cannot back up.",
  "",
  "begin;",
  "",
  ...finalSectors.map((sector) => {
    const name = sector.name.replaceAll("'", "''");
    const parentName = sector.parentName.replaceAll("'", "''");
    return (
      `insert into neighborhood (name, municipality, parent_id, centroid)\n` +
      `select '${name}', 'manizales', p.id, p.centroid\n` +
      `from neighborhood p\n` +
      `where p.name = '${parentName}' and p.municipality = 'manizales'\n` +
      `on conflict (name, municipality) do update set\n` +
      `  parent_id = excluded.parent_id,\n` +
      `  centroid  = excluded.centroid;`
    );
  }),
  "",
  "commit;",
  "",
].join("\n");

await writeFile("supabase/sectors.sql", sql);

const skippedTotal =
  skipped.excluded.length + skipped.orphaned.length + skipped.unmatchedParent.length;

console.log(
  `${finalSectors.length} sectores escritos en supabase/sectors.sql · ` +
    `${skippedTotal} saltados`,
);
console.log(
  `  excluidos ("Parte de(l) …"): ${skipped.excluded.length}` +
    (skipped.excluded.length ? ` — ${skipped.excluded.join(", ")}` : ""),
);
console.log(
  `  huérfanos (padre ausente en la fuente): ${skipped.orphaned.length}` +
    (skipped.orphaned.length ? ` — ${skipped.orphaned.join(", ")}` : ""),
);
console.log(
  `  padre sin polígono (tras alias): ${skipped.unmatchedParent.length}` +
    (skipped.unmatchedParent.length
      ? ` — ${skipped.unmatchedParent.join(", ")}`
      : ""),
);
console.log(
  "aplica el archivo con: npx supabase db execute --file supabase/sectors.sql",
);
