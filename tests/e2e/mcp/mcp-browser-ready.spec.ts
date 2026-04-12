import { test, expect } from '@playwright/test'

test.describe('MCP browser-ready state', () => {
  test('shows browser-attached state only after browser websocket is attached', async ({ page }) => {
    await page.goto('/')

    const headerButton = page.getByTestId('open-mcp-button')
    await expect(headerButton).toHaveAttribute('aria-label', /Connect AI Agent/)

    await headerButton.click()
    await page.getByRole('button', { name: /start session|new session/i }).first().click()

    await expect(headerButton).toHaveAttribute('aria-label', /Browser attached|AI Agent Connected/, { timeout: 10000 })
    await expect(page.getByText(/^Connected$/)).toBeVisible({ timeout: 10000 })
  })
})
 