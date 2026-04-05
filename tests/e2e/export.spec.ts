import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('lets the author prepare export settings before downloading', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.export.open()
    await app.export.renameFileTo('architecture-overview')
    await app.export.chooseScale(4)

    await expect(app.export.filenameInput).toHaveValue('architecture-overview')
    await expect(page.locator('[data-testid="export-scale-button-active"][data-scale="4"]')).toBeVisible()
  })

  test('downloads mmd, svg, and png representations of the current diagram', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()

    await app.export.open()
    await app.export.renameFileTo('system-map')
    const mmd = await app.export.downloadMmd()
    expect(mmd.suggestedFilename()).toBe('system-map.mmd')

    await app.export.open()
    await app.export.renameFileTo('system-map')
    const svg = await app.export.downloadSvg()
    expect(svg.suggestedFilename()).toBe('system-map.svg')

    await app.export.open()
    await app.export.renameFileTo('system-map')
    await app.export.chooseScale(3)
    const png = await app.export.downloadPng()
    expect(png.suggestedFilename()).toBe('system-map.png')
  })
})
