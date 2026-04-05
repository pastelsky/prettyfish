import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('Pages and diagrams', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('starts a new page in the diagram picker state', async ({ page }) => {
    const app = createApp(page)

    await app.createEmptyPage()
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Page 2')
  })

  test('starts a new diagram in the diagram picker state', async ({ page }) => {
    const app = createApp(page)

    await app.createEmptyDiagram()
  })

  test('turns a picked template into a rendered diagram node', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await expect(page.getByTestId('diagram-name-input').first()).toHaveValue(/Diagram/i)
  })

  test('supports building up multiple diagrams across multiple pages', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()
    await app.canvas.createDiagram()
    await app.canvas.shouldShowDiagramCount(3)

    await app.createEmptyPage()
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item')).toHaveCount(1)
    await expect(page.getByTestId('page-item-active')).toContainText('Page 2')
  })

  test('lets the author rename a page from the pages menu', async ({ page }) => {
    const app = createApp(page)

    await app.header.createPage()
    await app.header.renameLastPage('Architecture')

    await expect(app.header.pagesTrigger).toContainText('Architecture')
  })
})
