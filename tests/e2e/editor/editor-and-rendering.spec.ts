import { test } from '@playwright/test'
import { createApp } from '../support/pretty-fish-app'

test.describe('Editor and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await createApp(page).openFresh()
  })

  test('shows the editor and configuration after a template is chosen', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()
    await app.editor.shouldBeVisible()
    await app.editor.shouldShowConfiguration()
  })

  test('renders a valid Mermaid diagram after the editor content changes', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()
    await app.editor.replaceCodeWith('flowchart LR\n  A --> B\n  B --> C')
    await app.editor.shouldRenderDiagramPreview()
  })

  test('shows inline error feedback for invalid Mermaid syntax', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()
    await app.editor.replaceCodeWith('flowchart TD\n  BROKEN @@@')
    await app.editor.shouldShowErrorFeedback()
  })

  test('offers code copy once a diagram exists', async ({ page }) => {
    const app = createApp(page)

    await app.startFlowchartDiagram()
    await app.editor.shouldAllowCopyingCode()
  })

  test('keeps configuration hidden while the user is still choosing a diagram type', async ({ page }) => {
    const app = createApp(page)

    await app.createEmptyDiagram()
    await app.editor.shouldHideConfiguration()
  })
})
