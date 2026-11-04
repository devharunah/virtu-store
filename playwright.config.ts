import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);
// Its own port, so a stray dev server on 3000 is never mistaken for the app under test.
// E2E_PORT lets two worktrees run their suites side by side.
const PORT = Number(process.env["E2E_PORT"] ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Software WebGL (SwiftShader) is slow: walking the store in a test can take a minute or two.
  timeout: 240_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${PORT}`,
    // Headless Chromium renders WebGL in software (SwiftShader); this keeps it enabled.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !isCI,
  },
});
