import { test, expect } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

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
    await app.header.deleteLastPage()

    await app.header.shouldShowActivePageNamed('Page 1')
    await app.header.shouldShowInactivePageCount(0)
  })
})
