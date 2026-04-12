import { test, expect } from '@playwright/test'

test.describe('MCP panel passive state', () => {
  test('does not show relay connection error before user interacts', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    await expect(page.getByText('Failed to connect to relay WebSocket')).toHaveCount(0)

    await page.getByRole('button', { name: /connect ai agent|session ready|agent connected/i }).first().click()
    await expect(page.getByText('Failed to connect to relay WebSocket')).toHaveCount(0)
  })
})
