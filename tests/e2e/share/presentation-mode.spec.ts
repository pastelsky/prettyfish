import { expect, test } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

function encodePresentationState(payload: { svg: string; bg: string; title: string }) {
  return Buffer.from(unescape(encodeURIComponent(JSON.stringify(payload))), 'binary').toString('base64')
}

test.describe('Presentation mode', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('renders a shared diagram in the standalone presentation route', async ({ page, browser }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()

    const payload = await page.evaluate(() => {
      const svg = document.querySelector('.diagram-svg-container svg')?.outerHTML ?? ''
      return {
        svg,
        bg: 'transparent',
        title: (document.querySelector('[data-testid="diagram-name-input"]') as HTMLInputElement | null)?.value ?? 'Diagram',
      }
    })

    const encoded = encodePresentationState(payload)
    const presentation = await browser.newPage()
    await presentation.goto(`/present#${encoded}`, { waitUntil: 'networkidle' })

    await expect(presentation.locator('svg')).toBeVisible()
    await expect(presentation).toHaveTitle(/Pretty Fish/)
    await expect(presentation.getByText('Double-click to reset zoom')).toBeVisible()

    await presentation.close()
  })

  test('shows an empty-state message when no diagram payload is provided', async ({ browser }) => {
    const presentation = await browser.newPage()
    await presentation.goto('/present', { waitUntil: 'networkidle' })

    await expect(presentation.getByText('No diagram to display')).toBeVisible()

    await presentation.close()
  })
})
