import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import oxlint from "eslint-plugin-oxlint";

/**
 * Documentation is a suggestion; a lint rule is a boundary.
 *
 * The dependency rule for this project:
 *
 *   app/  →  data/  →  lib/
 *
 * A Server Component importing a DAL is correct and expected — that is the
 * intended path to the data. What is forbidden is going around it: reaching
 * the data source directly from the UI, or from anywhere in `data/` that is
 * not a DAL. A client component that imports a DAL fails at build time on the
 * `server-only` marker, which is a stronger guarantee than a lint rule.
 *
 * The door these rules guard used to be `@/lib/supabase/*` and
 * `@supabase/supabase-js`. It is `@/lib/demo/*` now — the fixtures that
 * replaced the database (see the README). The rule did not change with the
 * vendor, which is the point of writing it as a boundary rather than as a
 * mention of Postgres.
 *
 * Everything below turns a violation into an error at the first bad import,
 * instead of after eighty percent of a feature is written.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    // Deny-by-default: every submodule of `@/lib/demo/*` is off limits to the
    // UI. A new file under `lib/demo/`, or a real database put back behind
    // the DALs one day, is unreachable from here until someone deliberately
    // negates it — never unreachable by omission.
    name: "manizales/ui-may-not-reach-the-data-source",
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Deny by default and with no exceptions: nothing in the UI
              // reads the fixtures directly. A page that wants data asks a
              // DAL, which is what applies the visibility rules — the job
              // row-level security used to do inside Postgres and that only
              // `listPublished` does now.
              group: ["@/lib/demo/*"],
              message:
                "La fuente de datos no se lee desde la UI. Pide los datos a un DAL: es donde se aplica qué puede ver cada quien.",
            },
          ],
        },
      ],
    },
  },

  {
    // Deny-by-default for the data layer too: only a `*.dal.ts` file may ever
    // read the fixtures, so nothing here gets a `!` back open.
    name: "manizales/only-the-dal-touches-the-data-source",
    files: ["data/**/*.ts"],
    ignores: ["data/**/*.dal.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/demo/*"],
              message:
                "Solo *.dal.ts lee la fuente de datos. Un DTO, una policy o una action que la consulte rompe la única puerta de entrada.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "manizales/policies-stay-pure",
    files: ["data/**/*.policy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/demo/*", "next/headers", "next/navigation"],
              message:
                "Una policy es una función pura: recibe lo que necesita y devuelve un booleano. Sin sesión, sin base de datos, sin efectos.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "manizales/no-literal-colors",
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\b(bg|text|border|ring|fill|stroke)-(red|blue|green|yellow|amber|orange|slate|gray|zinc|neutral|stone|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|lime)-[0-9]{2,3}\\b/]",
          message:
            "Usa un token semántico (bg-primary, text-pending, bg-layer-shelter), nunca un color literal. La paleta se define en app/globals.css.",
        },
      ],
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Owned by the shadcn/mapcn CLI. Editing these means losing the changes on
    // the next update; wrap instead.
    "components/ui/**",
  ]),

  // Must be last: turns off every ESLint rule that `oxlint.config.ts` already
  // covers, so `npm run lint` and `npm run lint:oxlint` never report the same
  // problem twice.
  ...oxlint.buildFromOxlintConfigFile("./oxlint.config.ts"),
]);

export default eslintConfig;
