/**
 * End-to-end MCP integration test.
 *
 * 1. Opens pretty.fish in a headed browser
 * 2. Double-clicks "Connect MCP" to open the panel (admin mode)
 * 3. Generates a session and copies the MCP URL
 * 4. Configures OpenCode with the MCP URL in a temp directory
 * 5. Runs OpenCode to create diagrams via MCP
 * 6. Asserts the diagrams appeared in the browser
 *
 * Run with:
 *   npx playwright test tests/e2e/mcp/mcp-opencode-integration.spec.ts \
 *     --config playwright.production.config.ts --headed
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PRODUCTION_URL = 'https://pretty.fish'

test.describe('MCP + OpenCode integration', () => {
  test.use({ baseURL: PRODUCTION_URL })

  // Increase timeout — OpenCode calls take time
  test.setTimeout(120_000)

  test('create a diagram via OpenCode MCP', async ({ page }) => {
    // ── Step 1: Open pretty.fish and generate an MCP session ─────────────────

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page.getByTestId('app-root')).toBeVisible({ timeout: 20_000 })

    // Double-click to open MCP panel (admin mode, bypasses "Coming soon")
    const mcpButton = page.getByTestId('open-mcp-button')
    await mcpButton.dblclick()

    const panel = page.getByTestId('mcp-panel')
    await expect(panel).toBeVisible({ timeout: 5_000 })

    // Click Generate
    await panel.getByRole('button', { name: /generate/i }).click()

    // Wait for session to be ready — the CodeMirror editor appears
    await expect(panel.locator('.cm-editor')).toBeVisible({ timeout: 15_000 })

    // ── Step 2: Extract the MCP URL ──────────────────────────────────────────

    // Get the MCP URL from the quick install command text
    const codeBlock = panel.locator('code').first()
    const codeText = await codeBlock.textContent()
    const mcpUrl = codeText?.replace(/^npx\s+add-mcp\s+/, '').trim()
    expect(mcpUrl).toBeTruthy()
    expect(mcpUrl).toContain('/mcp/')
    console.log('MCP URL:', mcpUrl)

    // Take a screenshot of the panel
    await page.screenshot({ path: 'test-results/mcp-panel-before.png' })

    // ── Step 3: Configure OpenCode with this MCP server ──────────────────────

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prettyfish-mcp-test-'))
    const openCodeConfig = {
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        prettyfish: {
          enabled: true,
          type: 'remote' as const,
          url: mcpUrl!,
          timeout: 30000,
        },
      },
    }

    // Write config to temp dir
    fs.writeFileSync(
      path.join(tmpDir, 'opencode.json'),
      JSON.stringify(openCodeConfig, null, 2),
    )
    // Need a dummy file so opencode recognizes it as a project
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test\n')

    console.log('Temp dir:', tmpDir)
    console.log('OpenCode config:', JSON.stringify(openCodeConfig, null, 2))

    // ── Step 4: Run OpenCode to create a diagram ─────────────────────────────

    try {
      const result = execSync(
        `opencode run --pure "Using the prettyfish MCP server, create a simple flowchart diagram with three nodes: Start, Process, and End. Use the create_diagram tool."`,
        {
          cwd: tmpDir,
          timeout: 90_000,
          encoding: 'utf8',
          env: {
            ...process.env,
            // Force OpenCode to use the local config
            XDG_CONFIG_HOME: tmpDir,
          },
        },
      )
      console.log('OpenCode output:', result)
    } catch (error) {
      console.error('OpenCode error:', (error as { stderr?: string }).stderr || error)
      // Don't fail the test here — check the browser state instead
    }

    // ── Step 5: Assert the diagram appeared in the browser ───────────────────

    // Give the browser a moment to receive and render the diagram
    await page.waitForTimeout(3_000)

    // Take a screenshot after OpenCode ran
    await page.screenshot({ path: 'test-results/mcp-diagram-after.png' })

    // Check that a diagram was created — the canvas should have a rendered SVG
    const svgCount = await page.locator('.infinite-canvas svg.mermaid-svg, .diagram-container svg').count()
    console.log('SVG diagrams found:', svgCount)
    expect(svgCount).toBeGreaterThan(0)

    // ── Cleanup ──────────────────────────────────────────────────────────────
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
