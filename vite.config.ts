import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/**
 * Lists the built assets in the service worker so that one successful load is
 * enough to use the app offline afterwards.
 */
function precacheServiceWorker(): Plugin {
  return {
    name: 'the-missing-parts:precache-sw',
    apply: 'build',
    closeBundle() {
      const outDir = 'dist'
      const swPath = join(outDir, 'sw.js')
      let assets: string[] = []
      try {
        assets = readdirSync(join(outDir, 'assets')).map((name) => `./assets/${name}`)
      } catch {
        assets = []
      }
      const source = readFileSync(swPath, 'utf8')
        .replace('SW_PRECACHE', JSON.stringify(assets))
        .replace('SW_BUILD_ID', String(Date.now()))
      writeFileSync(swPath, source)
    },
  }
}

export default defineConfig({
  plugins: [react(), precacheServiceWorker()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
  },
})
