/**
 * Production smoke test for the MCP panel on pretty.fish.
 *
 * Runs directly against https://pretty.fish (not localhost) after a 6-minute
 * delay to let Cloudflare propagate the latest deployment before assertions.
 *
 * Run with:
 *   npx playwright test tests/e2e/mcp/mcp-panel-production.spec.ts \
 *     --config playwright.production.config.ts
 */

import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://pretty.fish'

// Wait for Cloudflare to propagate the deployment before starting.
// Only applied when the PRODUCTION_SMOKE env var is set to avoid slowing
// the normal local test suite.
test.beforeAll(async () => {
  if (process.env.PRODUCTION_SMOKE) {
    const delayMs = 6 * 60 * 1000
    console.log(`Waiting ${delayMs / 1000}s for production deployment to propagate…`)
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
  }
})

test.describe('MCP panel — production smoke', () => {
  test.use({ baseURL: PRODUCTION_URL })

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page.getByTestId('app-root')).toBeVisible({ timeout: 20_000 })
  })

  test('Connect MCP button is visible in the header', async ({ page }) => {
    await expect(page.getByTestId('open-mcp-button')).toBeVisible()
    await expect(page.getByTestId('open-mcp-button')).toContainText('Connect MCP')
  })

  test('opening the panel shows the correct header and subtext', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()

    const panel = page.getByTestId('mcp-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Connect MCP')
    await expect(panel).toContainText('Per-tab relay session')
  })

  test('panel opens without auto-generating a session', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()

    const panel = page.getByTestId('mcp-panel')
    await expect(panel).toBeVisible()

    // Should show the idle state — no session yet
    await expect(panel).toContainText('No session')
    await expect(panel).toContainText('Generate session')

    // Config snippet should NOT be visible yet
    await expect(panel.locator('.cm-editor')).not.toBeVisible()
  })

  test('generating a session reveals the MCP config snippet', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()

    const panel = page.getByTestId('mcp-panel')
    await expect(panel).toBeVisible()

    // Click Generate session
    await panel.getByRole('button', { name: /generate session/i }).click()

    // Should transition through connecting → session ready / browser connected
    await expect(panel).not.toContainText('No session', { timeout: 15_000 })

    // Config CodeMirror block should appear
    await expect(panel.locator('.cm-editor')).toBeVisible({ timeout: 15_000 })

    // Config should contain the MCP server URL pointing to the relay
    const configText = await panel.locator('.cm-editor').textContent()
    expect(configText).toContain('prettyfish')
    expect(configText).toContain('prettyfish-relay.binalgo.workers.dev')
  })

  test('copy button copies the MCP config to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByTestId('open-mcp-button').click()

    const panel = page.getByTestId('mcp-panel')
    await panel.getByRole('button', { name: /generate session/i }).click()
    await expect(panel.locator('.cm-editor')).toBeVisible({ timeout: 15_000 })

    // Click Copy
    await panel.getByRole('button', { name: /copy/i }).click()
    await expect(panel.getByRole('button', { name: /copied/i })).toBeVisible()

    // Clipboard should contain valid JSON with mcpServers key
    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    const parsed = JSON.parse(clipText) as { mcpServers?: unknown }
    expect(parsed).toHaveProperty('mcpServers')
  })

  test('new session button replaces the session ID', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()

    const panel = page.getByTestId('mcp-panel')
    await panel.getByRole('button', { name: /generate session/i }).click()
    await expect(panel.locator('.cm-editor')).toBeVisible({ timeout: 15_000 })

    // Grab the first session display ID
    const firstId = await panel.locator('.font-mono').first().textContent()

    // Generate a new session — panel temporarily loses the config block while connecting
    await panel.getByRole('button', { name: /new session/i }).click()

    // Wait until the ID changes (not just until the editor reappears, since IDs
    // are short prefixes and could theoretically collide on a retry)
    await expect(panel.locator('.font-mono').first()).not.toHaveText(firstId ?? '', { timeout: 15_000 })

    // Editor should be visible with the new session
    await expect(panel.locator('.cm-editor')).toBeVisible({ timeout: 5_000 })
  })

  test('panel closes on Escape key', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()
    await expect(page.getByTestId('mcp-panel')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('mcp-panel')).not.toBeVisible()
  })

  test('panel closes on backdrop click', async ({ page }) => {
    await page.getByTestId('open-mcp-button').click()
    await expect(page.getByTestId('mcp-panel')).toBeVisible()

    // Click the top-left corner (backdrop area, away from the panel)
    await page.mouse.click(100, 500)
    await expect(page.getByTestId('mcp-panel')).not.toBeVisible()
  })
})
