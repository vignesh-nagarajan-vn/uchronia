import { defineConfig } from '@playwright/test'

/** The mock-mode journey (§11.3). Both servers boot keyless. */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // An in-memory database, so every run starts on an empty shelf. A file
      // database let chronicles from a previous run linger in the catalogue,
      // where they collided with the journey's own locators.
      command: 'pnpm --filter @uchronia/server start:e2e',
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: false,
      cwd: '../..',
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @uchronia/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      timeout: 60_000,
    },
  ],
})
