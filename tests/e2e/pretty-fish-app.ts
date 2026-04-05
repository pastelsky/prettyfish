import { expect, type Locator, type Page } from '@playwright/test'

class HeaderBar {
  constructor(private readonly page: Page) {}

  get logoPill() { return this.page.getByTestId('header-logo-pill') }
  get pagesTrigger() { return this.page.getByTestId('pages-dropdown-trigger') }
  get docsToggle() { return this.page.getByTestId('toggle-docs-button') }
  get modeToggle() { return this.page.getByTestId('toggle-mode-button') }
  get themeTrigger() { return this.page.getByTestId('theme-dropdown-trigger') }
  get saveButton() { return this.page.getByTestId('save-project-button') }
  get openButton() { return this.page.getByTestId('open-project-button') }
  get resetButton() { return this.page.getByTestId('reset-workspace-button').first() }
  get shareButton() { return this.page.getByTestId('share-button') }

  async shouldBeVisible() {
    await expect(this.logoPill).toBeVisible()
    await expect(this.pagesTrigger).toBeVisible()
    await expect(this.modeToggle).toBeVisible()
    await expect(this.themeTrigger).toBeVisible()
  }

  async openPagesMenu() {
    const list = this.page.getByTestId('pages-dropdown-list')
    if (!(await list.isVisible().catch(() => false))) {
      await this.pagesTrigger.click()
    }
    await expect(list).toBeVisible()
  }

  async createPage() {
    await this.openPagesMenu()
    await this.page.getByTestId('page-add-button').click()
    await this.page.waitForTimeout(250)
  }

  async renameLastPage(name: string) {
    await this.openPagesMenu()
    await this.page.getByTestId('page-rename-button').last().click()
    const input = this.page.locator('[data-testid="pages-dropdown-list"] input').last()
    await input.fill(name)
    await input.press('Enter')
  }

  async toggleDocs() {
    await this.docsToggle.click()
  }

  async toggleColorMode() {
    await this.modeToggle.click()
    await this.page.waitForTimeout(250)
  }

  async chooseTheme(themeValue: string) {
    await this.themeTrigger.click()
    await expect(this.page.getByTestId('theme-dropdown-list')).toBeVisible()
    await this.page.locator(`[data-theme-value="${themeValue}"]`).click()
    await this.page.waitForTimeout(300)
  }

  async saveProject() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.saveButton.click(),
    ])
    return download
  }

  async loadProject(filePath: string) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.openButton.click(),
    ])
    await chooser.setFiles(filePath)
    await this.page.waitForTimeout(800)
  }

  async copyShareLink() {
    await this.shareButton.click()
    await this.page.waitForTimeout(300)
    return this.page.evaluate(() => navigator.clipboard.readText())
  }

  async resetWorkspace() {
    await this.resetButton.click()
    await expect(this.page.getByTestId('reset-workspace-confirm-button')).toBeVisible()
    await this.page.getByTestId('reset-workspace-confirm-button').click()
    await this.page.waitForTimeout(800)
  }
}

class TemplatePicker {
  constructor(private readonly page: Page) {}

  get root() { return this.page.getByTestId('template-gallery') }

  async shouldBeVisible() {
    await expect(this.root).toBeVisible()
    await expect(this.page.getByText('Choose a diagram type')).toBeVisible()
  }

  async choose(templateId: string) {
    await this.shouldBeVisible()
    await this.page.locator(`[data-testid="template-card"][data-template-id="${templateId}"]`).click()
    await this.page.waitForTimeout(700)
  }
}

class CanvasSurface {
  constructor(private readonly page: Page) {}

  get root() { return this.page.getByTestId('canvas-root') }
  get addDiagramButton() { return this.page.getByTestId('add-diagram-button') }
  get nodes() { return this.page.getByTestId('diagram-node') }
  get firstNode() { return this.nodes.first() }

  async shouldBeVisible() {
    await expect(this.root).toBeVisible()
    await expect(this.addDiagramButton).toBeVisible()
  }

  async createDiagram() {
    await this.addDiagramButton.click()
    await this.page.waitForTimeout(250)
  }

  async shouldShowDiagramCount(count: number) {
    await expect(this.nodes).toHaveCount(count)
  }

  async openDiagramContextMenu(node?: Locator) {
    const target = node ?? this.firstNode
    await target.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: 600,
        clientY: 240,
      }))
    })
    await expect(this.page.getByTestId('diagram-context-menu')).toBeVisible()
  }

  async openCanvasContextMenu() {
    const pane = this.page.locator('.react-flow__pane').first()
    await expect(pane).toBeVisible()
    await pane.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: 1100,
        clientY: 180,
      }))
    })
    await expect(this.page.getByTestId('canvas-context-menu')).toBeVisible()
  }

  async addDiagramWithShortcut() {
    await this.page.keyboard.press('Control+t')
    await this.page.waitForTimeout(250)
  }

  async copyFromContextMenu() {
    await this.page.getByTestId('context-copy-button').click()
  }

  async duplicateFromContextMenu() {
    await this.page.getByTestId('context-duplicate-button').click()
    await this.page.waitForTimeout(250)
  }

  async deleteFromContextMenu() {
    await this.page.getByTestId('context-delete-button').click()
    await this.page.waitForTimeout(250)
  }

  async shouldShowDiagramActions() {
    await expect(this.page.getByTestId('context-copy-button')).toBeVisible()
    await expect(this.page.getByTestId('context-duplicate-button')).toBeVisible()
    await expect(this.page.getByTestId('context-delete-button')).toBeVisible()
  }

  async shouldAllowPasteAndNewDiagram() {
    await expect(this.page.getByTestId('context-paste-button')).toBeEnabled()
    await expect(this.page.getByTestId('context-new-diagram-button')).toBeVisible()
  }
}

class EditorSidebar {
  constructor(private readonly page: Page) {}

  get root() { return this.page.getByTestId('sidebar-panel') }
  get header() { return this.page.getByTestId('editor-header') }
  get copyCodeButton() { return this.page.getByTestId('copy-code-button') }
  get configurationTrigger() { return this.page.getByTestId('configuration-trigger') }
  get configurationPanel() { return this.page.getByTestId('configuration-panel') }
  get editor() { return this.page.locator('.cm-editor').first() }
  get svgPreview() { return this.page.locator('.diagram-svg-container').first() }
  get resetDefaultsButton() { return this.page.getByTestId('config-reset-defaults-button') }

  async shouldBeVisible() {
    await expect(this.root).toBeVisible()
    await expect(this.header).toBeVisible()
  }

  async shouldShowConfiguration() {
    await expect(this.configurationTrigger).toBeVisible()
  }

  async openConfiguration() {
    await this.shouldShowConfiguration()
    await this.configurationTrigger.click()
    await expect(this.configurationPanel).toBeVisible()
  }

  async shouldHideConfiguration() {
    await expect(this.configurationTrigger).toHaveCount(0)
  }

  async switchToJsonMode() {
    await this.page.locator('[data-testid="config-view-mode-button"][data-view-mode="json"]').click()
  }

  async switchToVisualMode() {
    const target = this.page.locator('[data-view-mode="visual"]').first()
    await target.click()
  }

  async chooseLook(value: 'classic' | 'handDrawn') {
    await this.page.locator(`[data-testid="config-look-option"][data-look-value="${value}"], [data-testid="config-look-option-active"][data-look-value="${value}"]`).click()
  }

  async shouldUseLook(value: 'classic' | 'handDrawn') {
    await expect(this.page.locator(`[data-testid="config-look-option-active"][data-look-value="${value}"]`)).toBeVisible()
  }

  async shouldRequireBaseThemeForColors() {
    await expect(this.page.getByTestId('config-switch-to-base-button')).toBeVisible()
  }

  async switchColorsToBaseTheme() {
    await this.page.getByTestId('config-switch-to-base-button').click()
  }

  async shouldAllowBaseThemeColors() {
    await expect(this.page.getByText(/Using Base theme/i)).toBeVisible()
  }

  async resetToDefaults() {
    await this.resetDefaultsButton.click()
  }

  async replaceCodeWith(text: string) {
    await this.editor.click()
    await this.page.keyboard.press('Control+a')
    await this.page.keyboard.type(text, { delay: 10 })
    await this.page.waitForTimeout(900)
  }

  async shouldRenderDiagramPreview() {
    await expect(this.svgPreview).toBeVisible()
  }

  async shouldShowErrorFeedback() {
    await expect(this.page.getByText(/⚠/)).toBeVisible()
  }

  async shouldAllowCopyingCode() {
    await expect(this.copyCodeButton).toBeVisible()
  }
}

class ExportPopoverPanel {
  constructor(private readonly page: Page) {}

  get trigger() { return this.page.getByTestId('export-trigger') }
  get panel() { return this.page.getByTestId('export-panel') }
  get filenameInput() { return this.page.getByTestId('export-filename-input') }

  async open() {
    await this.trigger.click()
    await expect(this.panel).toBeVisible()
  }

  async renameFileTo(name: string) {
    await this.filenameInput.fill(name)
  }

  async chooseScale(scale: number) {
    await this.page.locator(`[data-testid="export-scale-button"][data-scale="${scale}"]`).click()
  }

  async downloadMmd() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByTestId('export-mmd-button').click(),
    ])
    return download
  }

  async downloadSvg() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByTestId('export-svg-button').click(),
    ])
    return download
  }

  async downloadPng() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByTestId('export-png-button').click(),
    ])
    return download
  }
}

class ReferenceDocsPanel {
  constructor(private readonly page: Page) {}

  get root() { return this.page.getByTestId('reference-docs-panel') }
  get typePicker() { return this.page.getByTestId('reference-type-picker') }
  get searchInput() { return this.page.getByTestId('reference-search-input') }

  async shouldBeVisible() {
    await expect(this.root).toBeVisible()
    await expect(this.typePicker).toBeVisible()
  }

  async shouldBeHidden() {
    await expect(this.root).toHaveCount(0)
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query)
    await expect(this.searchInput).toHaveValue(query)
  }

  async switchTo(referenceType: string) {
    await this.page.locator(`[data-reference-type="${referenceType}"]`).click()
    await expect(this.page.locator(`[data-testid="reference-type-button-active"][data-reference-type="${referenceType}"]`)).toBeVisible()
  }

  async expandFirstElement() {
    await this.page.getByTestId('reference-element-toggle').first().click()
    await this.page.waitForTimeout(200)
  }

  async insertExample(label: string) {
    await this.page.locator(`[data-testid="reference-insert-button"][data-reference-label="${label}"]`).first().click()
    await this.page.waitForTimeout(400)
  }

  async insertFirstVisibleExample() {
    await this.page.getByTestId('reference-insert-button').first().click()
    await this.page.waitForTimeout(400)
  }
}

export class PrettyFishApp {
  readonly header: HeaderBar
  readonly templates: TemplatePicker
  readonly canvas: CanvasSurface
  readonly editor: EditorSidebar
  readonly export: ExportPopoverPanel
  readonly docs: ReferenceDocsPanel

  constructor(readonly page: Page) {
    this.header = new HeaderBar(page)
    this.templates = new TemplatePicker(page)
    this.canvas = new CanvasSurface(page)
    this.editor = new EditorSidebar(page)
    this.export = new ExportPopoverPanel(page)
    this.docs = new ReferenceDocsPanel(page)
  }

  async openFresh() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' })
    await this.page.waitForLoadState('networkidle')
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await this.page.reload({ waitUntil: 'domcontentloaded' })
    await this.page.waitForLoadState('networkidle')
    await expect(this.page.getByTestId('app-root')).toBeVisible({ timeout: 15000 })
    await this.header.shouldBeVisible()
    await this.canvas.shouldBeVisible()
    await this.page.waitForTimeout(300)
  }

  async startFlowchartDiagram() {
    await this.templates.choose('flowchart')
  }

  async createEmptyPage() {
    await this.header.createPage()
    await this.templates.shouldBeVisible()
  }

  async createEmptyDiagram() {
    await this.canvas.createDiagram()
    await this.templates.shouldBeVisible()
  }

  async createFlowchartDiagram() {
    await this.startFlowchartDiagram()
    await this.canvas.shouldShowDiagramCount(1)
  }

  async undo() {
    await this.page.keyboard.press('Control+z')
    await this.page.waitForTimeout(250)
  }

  async redo() {
    await this.page.keyboard.press('Control+Shift+z')
    await this.page.waitForTimeout(250)
  }

  async resetWorkspace() {
    await this.header.resetWorkspace()
  }
}

export function createApp(page: Page) {
  return new PrettyFishApp(page)
}
