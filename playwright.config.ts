import { defineConfig } from '@playwright/test'

/** Use the supplied Chromium in containers and installed Chrome on Windows. */
const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/opt/pw-browsers/chromium')

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
    command:
      process.platform === 'win32'
        ? 'node node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1'
        : 'npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
