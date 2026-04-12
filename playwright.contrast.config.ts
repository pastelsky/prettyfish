/**
 * Playwright config for the rendered contrast audit.
 * Starts a minimal Express server (scripts/contrast-server.mjs) that serves
 * mermaid.js and a render harness page. Tests navigate to the harness and
 * call window.renderDiagram() via page.evaluate() — no app server needed.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/app',
  testMatch: 'contrast-rendered.spec.ts',
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4299',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/contrast-server.mjs 4299',
    url: 'http://127.0.0.1:4299/render.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
})
