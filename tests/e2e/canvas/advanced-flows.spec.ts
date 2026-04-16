import { expect, test } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('Advanced flows', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await createApp(page).openFresh()
  })

  test('keeps the workspace unchanged when reset is canceled', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.header.createPage()
    await app.startFlowchartDiagram()

    await app.header.openResetWorkspaceDialog()
    await app.header.cancelResetWorkspace()

    await app.header.shouldShowActivePageNamed('Page 2')
    await app.header.shouldShowInactivePageCount(1)
  })

  test('duplicates the selected diagram from the context menu', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.openDiagramContextMenu()
    await app.canvas.duplicateFromContextMenu()

    await app.canvas.shouldShowDiagramCount(2)
  })

  test('copies a share link from the diagram context menu', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.openDiagramContextMenu()

    const shareUrl = await app.canvas.copyShareLinkFromContextMenu()
    expect(shareUrl).toContain('#/d/')
  })

  test('persists diagram name and description edits across reloads', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()

    await app.editor.renameDiagram(1, 'Checkout Flow')
    await app.editor.describeDiagram(1, 'Primary user purchase path')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await app.editor.shouldRememberDiagramDetails(1, {
      name: 'Checkout Flow',
      description: 'Primary user purchase path',
    })
  })

  test('lets the reader collapse and expand the editor panel', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()

    await app.editor.collapse()
    await app.editor.expand()
  })

  test('keeps the bottom diagram selector in sync with canvas selection', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()

    await app.editor.renameDiagram(1, 'First Diagram')
    await app.editor.renameDiagram(2, 'Second Diagram')

    await app.diagramPicker.chooseDiagram(1)
    await app.diagramPicker.shouldShowCurrentDiagramNamed('First Diagram')
    await expect(app.editor.diagramDescriptions.first()).toBeVisible()

    await app.canvas.selectDiagram(2)
    await app.diagramPicker.shouldShowCurrentDiagramNamed('Second Diagram')
  })

  test('uses the bottom diagram selector to pan back to an off-screen diagram', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()
    await app.canvas.createDiagram()
    await app.canvas.createDiagram()

    await app.canvas.renameDiagram(1, 'Overview')
    await app.canvas.renameDiagram(4, 'Deep Detail')

    await app.canvas.selectDiagram(4)
    await app.diagramPicker.shouldShowCurrentDiagramNamed('Deep Detail')

    await app.diagramPicker.chooseDiagram(1)
    await app.diagramPicker.shouldShowCurrentDiagramNamed('Overview')
    await app.canvas.shouldBringDiagramIntoView(1)
  })

  test('shows corner-only resize controls for selected diagrams', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.selectDiagram(1)

    await app.canvas.shouldShowCornerResizeOnly()
  })

  test('pans on scroll without changing zoom', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()

    const before = await app.canvas.getViewportTransform()
    await app.canvas.scrollCanvas(0, 500)
    const after = await app.canvas.getViewportTransform()

    expect(after.zoom).toBeCloseTo(before.zoom, 5)
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(0)
  })
})
