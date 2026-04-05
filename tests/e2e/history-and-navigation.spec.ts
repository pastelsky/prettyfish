import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('History and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('lets the author undo and redo deleting the current diagram', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.shouldShowDiagramCount(1)

    await app.canvas.openDiagramContextMenu(app.canvas.firstNode)
    await app.canvas.deleteFromContextMenu()
    await app.canvas.shouldShowDiagramCount(0)

    await app.undo()
    await app.canvas.shouldShowDiagramCount(1)

    await app.redo()
    await app.canvas.shouldShowDiagramCount(0)
  })

  test('lets the author remove an extra page from the pages menu', async ({ page }) => {
    const app = createApp(page)

    await app.header.createPage()
    await app.header.openPagesMenu()
    await page.getByTestId('page-delete-button').last().click()
    await page.waitForTimeout(300)

    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Page 1')
    await expect(page.getByTestId('page-item')).toHaveCount(0)
  })
})
