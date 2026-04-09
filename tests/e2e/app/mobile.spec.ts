import { expect, test } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('Mobile shell', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await createApp(page).openFresh()
  })

  test('keeps the mobile editor collapsed by default after selecting a diagram', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()

    await expect(app.editor.root).toBeVisible()
    await expect(page.getByRole('button', { name: 'Expand editor panel' })).toBeVisible()
    await app.mobile.shouldKeepCanvasClear()
  })

  test('keeps the mobile canvas clear when the collapsed editor is visible', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()
    await app.mobile.shouldKeepCanvasClear()

    await app.canvas.selectDiagram(1)
    await app.mobile.shouldKeepCanvasClear()
  })

  test('shows the important compact controls on mobile', async ({ page }) => {
    const app = createApp(page)

    await app.mobile.shouldShowPrimaryControls()
  })

  test('lets the reader add a new diagram from the mobile floating action button', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagramOnMobile()
    await app.canvas.shouldShowDiagramCount(2)
  })
})
