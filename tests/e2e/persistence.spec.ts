import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('IndexedDB persistence', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('restores the latest workspace after a reload', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()
    await app.header.createPage()
    await app.startFlowchartDiagram()
    await app.header.renameLastPage('Persisted Page')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.getByTestId('pages-dropdown-trigger').click()
    await expect(page.getByTestId('page-item-active')).toContainText('Persisted Page')
    await expect(page.getByTestId('diagram-node')).toHaveCount(1)
  })

  test('reset workspace clears the persisted document and returns to a fresh starter state', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.header.createPage()
    await app.startFlowchartDiagram()
    await app.resetWorkspace()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.getByTestId('pages-dropdown-trigger').click()
    await expect(page.getByTestId('page-item-active')).toContainText('Page 1')
    await expect(page.getByTestId('page-item')).toHaveCount(0)
    await expect(page.getByTestId('template-gallery')).toBeVisible()
  })
})
