import { test, expect } from '@playwright/test'

test.describe('MCP relay connection', () => {
  test('starting a session reaches a connected UI state even if the first websocket attempt races', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /connect ai agent|session ready|agent connected/i }).first().click()

    const startSession = page.getByRole('button', { name: /start session|new session/i }).first()
    await expect(startSession).toBeVisible()
    await startSession.click()

    // The relay may do an immediate reconnect after an initial transient close.
    // Assert eventual user-visible success, not a particular low-level socket sequence.
    await expect(page.getByText(/^Connected$/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^[a-z]+-[a-z]+-[a-z]+-[a-f0-9]{4}$/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/npx add-mcp .*\/mcp\//)).toBeVisible({ timeout: 10000 })
  })
})
