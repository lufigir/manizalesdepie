import { defineConfig } from "oxlint";

/**
 * Oxlint runs alongside ESLint (`eslint.config.mjs`), not instead of it.
 * `eslint-plugin-oxlint` disables the ESLint rules Oxlint already covers so
 * the same problem is never reported twice. See `npm run lint` (ESLint) and
 * `npm run lint:oxlint` (this file).
 */
export default defineConfig({
  categories: { correctness: "error" },
  plugins: ["import", "typescript"],
  options: {
    // Requires the type checker, hence slower than the syntax-only rules —
    // worth it here: this project is built from server actions, and an
    // action that does not await its DAL call reports success for a write
    // that never happened.
    typeAware: true,
  },
  rules: {
    "import/no-cycle": "error",
    "typescript/no-floating-promises": "error",
  },
  overrides: [
    {
      // Owned by the shadcn/mapcn CLI (see AGENTS.md) — editing it loses the
      // change on the next update, so it is exempt from this repo's rules,
      // same as the ESLint boundary in eslint.config.mjs.
      files: ["components/ui/**"],
      rules: {
        "typescript/no-floating-promises": "off",
      },
    },
  ],
});
