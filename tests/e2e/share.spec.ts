import { test, expect } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('Share', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await createApp(page).openFresh()
  })

  test('shares only the active diagram and restores it from the shared url', async ({ page, browser }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.createDiagram()
    await app.header.createPage()
    await app.startFlowchartDiagram()

    const shareUrl = await app.header.copyShareLink()
    expect(shareUrl).toContain('#/d/')

    const sharedContext = await browser.newContext()
    const shared = await sharedContext.newPage()
    await shared.goto(shareUrl, { waitUntil: 'domcontentloaded' })
    await shared.waitForLoadState('networkidle')

    await expect(shared.getByTestId('app-root')).toBeVisible()
    await expect(shared.getByTestId('diagram-node')).toHaveCount(1)

    await shared.getByTestId('pages-dropdown-trigger').click()
    await expect(shared.getByTestId('page-item-active')).toContainText('Page 2')

    await shared.close()
    await sharedContext.close()
  })
})
