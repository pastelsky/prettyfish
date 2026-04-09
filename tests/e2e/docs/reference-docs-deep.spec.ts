import { test, expect } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('Reference docs navigation', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('lets the reader switch reference types and insert an example into the editor', async ({ page }) => {
    const app = createApp(page)

    await app.header.toggleDocs()
    await app.docs.shouldBeVisible()
    await app.docs.switchTo('sequenceDiagram')
    await app.docs.expandFirstElement()
    await app.docs.insertFirstVisibleExample()

    await app.editor.shouldBeVisible()
    await expect(page.locator('.cm-editor')).toContainText('sequenceDiagram')
  })

  test('filters reference content after changing diagram type tabs', async ({ page }) => {
    const app = createApp(page)

    await app.header.toggleDocs()
    await app.docs.switchTo('gantt')
    await app.docs.searchFor('axis')
    await expect(page.getByRole('button', { name: /axisFormat/i })).toBeVisible()
  })
})
