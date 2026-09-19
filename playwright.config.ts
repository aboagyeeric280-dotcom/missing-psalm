import { defineConfig } from '@playwright/test'

/** The container ships one Chromium build; use it rather than downloading another. */
const CHROMIUM = '/opt/pw-browsers/chromium'

/**
 * End-to-end checks run against the production build, because two of the
 * required self-checks — offline use and a 375px screen — only mean anything
 * in a real browser.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
  },
  projects: [
    {
      name: 'mobile-375',
      use: {
        browserName: 'chromium',
        launchOptions: { executablePath: CHROMIUM },
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        launchOptions: { executablePath: CHROMIUM },
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
