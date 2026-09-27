// End-to-end tests: the real app in a real (headless) Chromium, against the Vite dev server.
// Run with `npx playwright test`. The server starts on port 5186 unless one is already running.

import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const PORT = 5186
const BASE = `http://localhost:${PORT}/slate-demo/`

/**
 * Which Chromium to drive: PLAYWRIGHT_CHROMIUM, else a machine-local path kept in the gitignored
 * .private/chromium-path, else Playwright's own download (npx playwright install chromium).
 */
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM ?? localChromium()

function localChromium(): string | undefined {
  try {
    return readFileSync('.private/chromium-path', 'utf8').trim() || undefined
  } catch {
    return undefined
  }
}

export default defineConfig({
  testDir: './e2e',
  // The dev server compiles each module on first request, so the first page of a run is slow.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
