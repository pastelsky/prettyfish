import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('Project save and load', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('restores a saved multi-page project from disk', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()
    await app.header.createPage()
    await app.startFlowchartDiagram()
    await app.header.renameLastPage('Recovered Page')

    const download = await app.header.saveProject()
    const savedPath = await download.path()
    expect(download.suggestedFilename()).toContain('prettyfish-project')
    expect(savedPath).toBeTruthy()

    await app.openFresh()
    await app.header.loadProject(savedPath!)

    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item')).toHaveCount(1)
    await expect(page.getByTestId('page-item-active')).toContainText('Recovered Page')
    await app.canvas.shouldShowDiagramCount(1)
  })
})
