import { test } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe('Configuration and theme interplay', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('lets the author move between visual and JSON configuration modes', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.editor.openConfiguration()
    await app.editor.switchToJsonMode()
    await app.page.getByText('Invalid JSON').waitFor({ state: 'detached', timeout: 50 }).catch(() => {})
    await app.editor.switchToVisualMode()
    await app.editor.shouldShowConfiguration()
  })

  test('keeps a deliberate look override even after the theme changes', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.editor.openConfiguration()
    await app.header.chooseTheme('corporate')
    await app.editor.chooseLook('handDrawn')
    await app.editor.shouldUseLook('handDrawn')

    await app.header.chooseTheme('amethyst')
    await app.editor.shouldUseLook('handDrawn')
  })

  test('uses base theme gating for editable color overrides, then clears back to defaults', async ({ page }) => {
    const app = createApp(page)

    await app.createFlowchartDiagram()
    await app.editor.openConfiguration()
    await app.header.chooseTheme('corporate')
    await app.editor.shouldRequireBaseThemeForColors()

    await app.editor.switchColorsToBaseTheme()
    await app.editor.shouldAllowBaseThemeColors()

    await app.editor.chooseLook('handDrawn')
    await app.editor.shouldUseLook('handDrawn')

    await app.editor.resetToDefaults()
    await app.editor.shouldUseLook('classic')
  })
})
