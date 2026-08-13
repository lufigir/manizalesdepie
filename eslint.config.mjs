import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Documentation is a suggestion; a lint rule is a boundary.
 *
 * The dependency rule for this project:
 *
 *   app/  →  data/  →  lib/
 *
 * A Server Component importing a DAL is correct and expected — that is the
 * intended path to the database. What is forbidden is going around it: the
 * service-role client, raw supabase-js, or server-only configuration reaching
 * the UI layer. A client component that imports a DAL fails at build time on
 * the `server-only` marker, which is a stronger guarantee than a lint rule.
 *
 * Everything below turns a violation into an error at the first bad import,
 * instead of after eighty percent of a feature is written.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    name: "manizales/ui-may-not-reach-the-database",
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "@supabase/supabase-js"],
              message:
                "El cliente con rol de servicio salta row-level security. Solo un *.dal.ts puede importarlo.",
            },
            {
              group: ["@/lib/env.server"],
              message:
                "Las variables de servidor no cruzan a la capa de UI. Pásalas como props desde un Server Component.",
            },
          ],
        },
      ],
    },
  },

  {
    name: "manizales/only-the-dal-touches-the-database",
    files: ["data/**/*.ts"],
    ignores: ["data/**/*.dal.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "@supabase/supabase-js"],
              message:
                "Solo *.dal.ts habla con la base de datos. Un DTO, una policy o una action que consulte rompe la única puerta de entrada.",
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
              group: ["@/lib/supabase/*", "next/headers", "next/navigation"],
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
            "Usa un token semántico (bg-primary, text-unclaimed, bg-layer-shelter), nunca un color literal. La paleta se define en app/globals.css.",
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
]);

export default eslintConfig;
