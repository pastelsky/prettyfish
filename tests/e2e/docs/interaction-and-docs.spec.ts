import { test, expect } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('Interactions and docs', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('shows copy, duplicate, and delete when a diagram menu is opened', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.openDiagramContextMenu()
    await app.canvas.shouldShowDiagramActions()
  })

  test('shows paste and new-diagram actions in the empty-canvas menu after copying a diagram', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.openDiagramContextMenu()
    await app.canvas.copyFromContextMenu()
    await app.canvas.openCanvasContextMenu()
    await app.canvas.shouldAllowPasteAndNewDiagram()
  })

  test('lists both built-in and custom themes in the theme picker', async ({ page }) => {
    const app = createApp(page)

    await app.header.themeTrigger.click()
    await expect(page.getByTestId('theme-dropdown-list')).toBeVisible()
    await expect(page.locator('[data-theme-value="default"]')).toBeVisible()
    await expect(page.locator('[data-theme-value="amethyst"]')).toBeVisible()
  })

  test('lets the reader search the reference docs', async ({ page }) => {
    const app = createApp(page)

    await app.header.toggleDocs()
    await app.docs.searchFor('arrow')
  })

  test('allows keyboard-driven creation of additional diagrams', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.addDiagramWithShortcut()
    await app.canvas.addDiagramWithShortcut()
    await app.canvas.shouldShowDiagramCount(3)
  })
})
