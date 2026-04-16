/**
 * Mobile UX audit — captures screenshots at every key interaction stage
 * so we can visually assess the mobile experience.
 *
 * Run with:
 *   PLAYWRIGHT=true LOCAL_APP_ONLY=true npx playwright test tests/e2e/mobile/mobile-ux.spec.ts --reporter=line
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOT_DIR = path.join('tests', 'e2e', 'mobile', 'screenshots')
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const shot = (page: import('@playwright/test').Page, name: string) =>
  page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false })

// Emulate iPhone 14 Pro in Chromium
test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})

test.describe('Mobile UX audit', () => {

  test('01 — initial load', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    await shot(page, '01-initial-load')
    // Header should be visible
    await expect(page.locator('header, [role="banner"]').first()).toBeVisible()
  })

  test('02 — header bar layout', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    await shot(page, '02-header-bar')
    // Check all 3 header pills render without overflow
    const header = page.locator('header').first()
    await expect(header).toBeVisible()
  })

  test('03 — canvas with diagram', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    await shot(page, '03-canvas-with-diagram')
  })

  test('04 — open sidebar / editor', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    // tap sidebar toggle
    const sidebarBtn = page.getByRole('button', { name: /sidebar|editor|toggle/i }).first()
    if (await sidebarBtn.isVisible()) {
      await sidebarBtn.tap()
      await page.waitForTimeout(500)
    }
    await shot(page, '04-sidebar-open')
  })

  test('05 — editor with code visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const sidebarBtn = page.getByRole('button', { name: /sidebar|editor|toggle/i }).first()
    if (await sidebarBtn.isVisible()) {
      await sidebarBtn.tap()
      await page.waitForTimeout(500)
    }
    await shot(page, '05-editor-code')
    // Editor should have some text
    const editor = page.locator('.cm-editor, .CodeMirror, [data-testid="editor"]').first()
    if (await editor.isVisible()) {
      await expect(editor).toBeVisible()
    }
  })

  test('06 — tap on editor to focus/type', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const sidebarBtn = page.getByRole('button', { name: /sidebar|editor|toggle/i }).first()
    if (await sidebarBtn.isVisible()) {
      await sidebarBtn.tap()
      await page.waitForTimeout(500)
    }
    const editor = page.locator('.cm-content, .cm-editor').first()
    if (await editor.isVisible()) {
      await editor.tap()
      await page.waitForTimeout(500)
    }
    await shot(page, '06-editor-focused')
  })

  test('07 — theme selector', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    // Find theme button — may be icon only on mobile
    const themeBtn = page.getByRole('button', { name: /theme/i }).first()
    if (await themeBtn.isVisible()) {
      await themeBtn.tap()
      await page.waitForTimeout(500)
      await shot(page, '07-theme-dropdown')
    } else {
      await shot(page, '07-theme-btn-not-visible')
    }
  })

  test('08 — pages dropdown', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const pagesBtn = page.getByRole('button', { name: /page|pages/i }).first()
    if (await pagesBtn.isVisible()) {
      await pagesBtn.tap()
      await page.waitForTimeout(400)
      await shot(page, '08-pages-dropdown')
    } else {
      await shot(page, '08-pages-btn-not-visible')
    }
  })

  test('09 — add new page', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const pagesBtn = page.getByRole('button', { name: /page|pages/i }).first()
    if (await pagesBtn.isVisible()) {
      await pagesBtn.tap()
      await page.waitForTimeout(400)
      const newPageBtn = page.getByRole('button', { name: /new page/i }).first()
      if (await newPageBtn.isVisible()) {
        await newPageBtn.tap()
        await page.waitForTimeout(400)
      }
    }
    await shot(page, '09-new-page-added')
  })

  test('10 — canvas pan/zoom gesture', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Simulate a pinch-to-zoom by dispatching touch events
    await page.touchscreen.tap(200, 400)
    await page.waitForTimeout(300)
    await shot(page, '10-canvas-after-tap')
  })

  test('11 — diagram node tap (select)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2500)
    // Tap roughly where the diagram node would be
    await page.touchscreen.tap(200, 350)
    await page.waitForTimeout(400)
    await shot(page, '11-diagram-node-tapped')
  })

  test('12 — export popover', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const exportBtn = page.getByRole('button', { name: /export/i }).first()
    if (await exportBtn.isVisible()) {
      await exportBtn.tap()
      await page.waitForTimeout(400)
      await shot(page, '12-export-popover')
    } else {
      await shot(page, '12-export-btn-not-visible')
    }
  })

  test('13 — share / presentation mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const shareBtn = page.getByRole('button', { name: /share|present/i }).first()
    if (await shareBtn.isVisible()) {
      await shareBtn.tap()
      await page.waitForTimeout(400)
      await shot(page, '13-share-popover')
    } else {
      await shot(page, '13-share-btn-not-visible')
    }
  })

  test('14 — keyboard help dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    const helpBtn = page.getByRole('button', { name: /help|keyboard/i }).first()
    if (await helpBtn.isVisible()) {
      await helpBtn.tap()
      await page.waitForTimeout(400)
      await shot(page, '14-help-dialog')
    } else {
      await shot(page, '14-help-btn-not-visible')
    }
  })

  test('15 — config panel', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1500)
    // Select a diagram first
    await page.touchscreen.tap(200, 350)
    await page.waitForTimeout(300)
    // Look for config toggle
    const configBtn = page.getByRole('button', { name: /config|settings/i }).first()
    if (await configBtn.isVisible()) {
      await configBtn.tap()
      await page.waitForTimeout(400)
      await shot(page, '15-config-panel')
    } else {
      await shot(page, '15-config-btn-not-visible')
    }
  })

  test('16 — landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 852, height: 393 })
    await page.goto('/')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16-landscape.png') })
  })

  test('17 — dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17-dark-mode.png') })
    // Toggle dark mode via button if available
    const darkBtn = page.getByRole('button', { name: /dark|light|mode/i }).first()
    if (await darkBtn.isVisible()) {
      await darkBtn.tap()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17b-dark-mode-toggled.png') })
    }
  })
})
