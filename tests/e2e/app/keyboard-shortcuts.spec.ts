import { test, expect, type Page } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

async function dispatchShortcut(page: Page, init: {
  key: string
  code: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}) {
  await page.evaluate((eventInit) => {
    const down = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...eventInit })
    const up = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...eventInit })
    document.dispatchEvent(down)
    document.dispatchEvent(up)
  }, init)
}

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('supports all documented keyboard shortcuts end-to-end', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.canvas.shouldShowDiagramCount(1)

    // Diagram shortcuts
    await page.keyboard.press('Control+t')
    await page.waitForTimeout(250)
    await app.canvas.shouldShowDiagramCount(2)

    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(300)
    await app.canvas.shouldShowDiagramCount(3)

    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
    await app.canvas.shouldShowDiagramCount(2)

    // Undo / redo shortcuts
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(250)
    await app.canvas.shouldShowDiagramCount(3)

    await page.keyboard.press('Control+Shift+z')
    await page.waitForTimeout(250)
    await app.canvas.shouldShowDiagramCount(2)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(250)
    await app.canvas.shouldShowDiagramCount(3)

    await page.keyboard.press('Control+y')
    await page.waitForTimeout(250)
    await app.canvas.shouldShowDiagramCount(2)

    // Page shortcuts
    await page.keyboard.press('Control+Shift+t')
    await page.waitForTimeout(300)
    await app.templates.shouldBeVisible()
    await app.startFlowchartDiagram()
    await app.header.renameLastPage('Shortcut Page')

    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Shortcut Page')
    await page.keyboard.press('Escape')
    await app.header.logoPill.click()

    await page.keyboard.press('Control+Shift+BracketLeft')
    await page.waitForTimeout(300)
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Page 1')
    await page.keyboard.press('Escape')
    await app.header.logoPill.click()

    await page.keyboard.press('Control+Shift+BracketRight')
    await page.waitForTimeout(300)
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Shortcut Page')
    await page.keyboard.press('Escape')

    // Panel shortcuts
    await expect(app.editor.root).toBeVisible()
    await page.keyboard.press('Control+\\')
    await expect(app.editor.root).toBeHidden()

    await page.keyboard.press('Control+Shift+E')
    await expect(app.editor.root).toBeVisible()

    await app.docs.shouldBeHidden()
    await page.keyboard.press('Control+Shift+R')
    await app.docs.shouldBeVisible()
    await page.keyboard.press('Control+Shift+R')
    await app.docs.shouldBeHidden()

    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+/')
    await expect(app.editor.editor).toHaveClass(/cm-focused/)
    await page.keyboard.press('Escape')

    // File + action shortcuts
    const startedDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    await dispatchShortcut(page, { key: 'D', code: 'KeyD', ctrlKey: true, shiftKey: true })
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!startedDark)

    await app.header.logoPill.click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dispatchShortcut(page, { key: 's', code: 'KeyS', ctrlKey: true }),
    ])
    const savedPath = await download.path()
    expect(savedPath).toBeTruthy()

    await app.resetWorkspace()
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Page 1')
    await page.keyboard.press('Escape')

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.keyboard.press('Control+O'),
    ])
    await chooser.setFiles(savedPath!)
    await page.waitForTimeout(1000)
    await app.header.openPagesMenu()
    await expect(page.getByTestId('page-item-active')).toContainText('Shortcut Page')
    await page.keyboard.press('Escape')

    // Help dialog shortcut + documented coverage
    await page.keyboard.press('Escape')
    await dispatchShortcut(page, { key: '?', code: 'Slash', shiftKey: true })
    const helpDialog = page.getByRole('dialog')
    await expect(helpDialog).toContainText('Shortcuts')

    for (const label of [
      'New diagram',
      'Copy selected diagram',
      'Paste duplicated diagram',
      'Delete selected diagram',
      'New page',
      'Next page',
      'Previous page',
      'Toggle editor sidebar',
      'Toggle editor sidebar (alt)',
      'Toggle reference docs',
      'Focus editor',
      'Blur / dismiss',
      'Undo canvas/page operation',
      'Redo canvas/page operation',
      'Redo canvas/page operation (alt)',
      'Save project',
      'Open project',
      'Toggle dark mode',
      'This dialog',
    ]) {
      await expect(helpDialog.getByText(label, { exact: true })).toBeVisible()
    }

    await page.keyboard.press('Escape')
    await expect(helpDialog).toBeHidden()
  })
})
