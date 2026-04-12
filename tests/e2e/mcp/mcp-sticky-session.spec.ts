import { test, expect } from '@playwright/test'

test.describe('MCP sticky session persistence', () => {
  test('keeps the same session id across reload and reconnect attempts', async ({ page }) => {
    await page.goto('/')

    await page.getByTestId('open-mcp-button').click()
    await page.getByRole('button', { name: /start session|new session/i }).first().click()

    const sessionBadge = page.locator('text=/^[a-z]+-[a-z]+-[a-z]+-[a-f0-9]{4}$/').first()
    await expect(sessionBadge).toBeVisible({ timeout: 10000 })
    const firstId = (await sessionBadge.textContent())?.trim()
    expect(firstId).toBeTruthy()

    await page.reload({ waitUntil: 'networkidle' })
    await page.getByTestId('open-mcp-button').click()

    const sessionBadgeAfter = page.locator('text=/^[a-z]+-[a-z]+-[a-z]+-[a-f0-9]{4}$/').first()
    await expect(sessionBadgeAfter).toBeVisible({ timeout: 10000 })
    const secondId = (await sessionBadgeAfter.textContent())?.trim()

    expect(secondId).toBe(firstId)
  })
})
