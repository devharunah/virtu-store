import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    // CommonJS by necessity: next/jest is only published as CJS.
    "jest.config.cjs",
    // The Claude Code harness. Vendored from everything-claude-code and kept as it
    // arrives, so upstream changes stay a clean copy rather than a merge. Biome
    // ignores it for the same reason.
    ".claude/**",
  ]),
]);
