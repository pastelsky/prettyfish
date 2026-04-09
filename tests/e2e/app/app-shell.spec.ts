import { test, expect } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('App shell', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('shows the main shell for editing diagrams', async ({ page }) => {
    const app = createApp(page)

    await app.header.shouldBeVisible()
    await app.canvas.shouldBeVisible()
    await expect(app.header.saveButton).toBeVisible()
    await expect(app.header.openButton).toBeVisible()
  })

  test('lets the reader open and close the reference docs panel', async ({ page }) => {
    const app = createApp(page)

    await app.header.toggleDocs()
    await app.docs.shouldBeVisible()

    await app.header.toggleDocs()
    await app.docs.shouldBeHidden()
  })

  test('switches the interface color mode', async ({ page }) => {
    const app = createApp(page)
    const before = await app.header.modeToggle.getAttribute('aria-label')

    await app.header.toggleColorMode()

    const after = await app.header.modeToggle.getAttribute('aria-label')
    expect(after).not.toEqual(before)
  })
})
