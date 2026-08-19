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
    // Deny-by-default: every submodule of `@/lib/supabase/*` is off limits to
    // the UI unless a `!` line below says otherwise. A vendor added next
    // month, or a new file under `lib/supabase/`, is unreachable from here
    // until someone deliberately negates it — never unreachable by omission.
    name: "manizales/ui-may-not-reach-the-database",
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/supabase/*",
                "@supabase/supabase-js",
                // `map-workspace.tsx` subscribes to realtime straight from
                // the browser (see AGENTS.md: "Realtime goes browser →
                // Postgres directly"), which is the one place the UI is
                // meant to hold a Supabase client at all.
                "!@/lib/supabase/client",
              ],
              message:
                "El cliente con rol de servicio, o cualquier otro cliente de Supabase, salta row-level security o la única puerta de entrada. Solo un *.dal.ts puede importarlo, salvo el cliente de navegador para realtime.",
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
    // The session lives outside `data/` on purpose (see `app/auth/actions.ts`):
    // signing in and out touches only cookies, never a query, so routing it
    // through a DAL would blur the one rule that keeps queries in one place.
    // This narrows the block above back open for `@/lib/supabase/server`
    // here and nowhere else — the service-role client stays denied.
    name: "manizales/auth-session-may-use-the-server-client",
    files: ["app/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/supabase/*",
                "@supabase/supabase-js",
                "!@/lib/supabase/server",
                // The Google button starts the OAuth redirect from the
                // browser, so it needs the browser client too.
                "!@/lib/supabase/client",
              ],
              message:
                "El cliente con rol de servicio salta row-level security. Solo *.dal.ts o la sesión de auth (cliente de servidor o de navegador) pueden importar un cliente de Supabase aquí.",
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
    // Deny-by-default for the data layer too: only a `*.dal.ts` file may ever
    // hold a Supabase client, so nothing here gets a `!` back open.
    name: "manizales/only-the-dal-touches-the-database",
    files: ["data/**/*.ts"],
    ignores: [
      "data/**/*.dal.ts",
      // Not named `*.dal.ts`, but the same shape by necessity: `requireUser`
      // resolves the session and reads `profile` before any DAL factory can
      // run, since every `create()` needs it to build its authorization
      // context. A second door, opened for the one caller with nowhere else
      // to stand.
      "data/user/require-user.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/*", "@supabase/supabase-js"],
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
