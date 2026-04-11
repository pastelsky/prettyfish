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
  get mcpButton() { return this.page.getByTestId('open-mcp-button') }

  async shouldBeVisible() {
    await expect(this.logoPill).toBeVisible()
    await expect(this.pagesTrigger).toBeVisible()
    await expect(this.modeToggle).toBeVisible()
    const themeVisible = await this.themeTrigger.isVisible().catch(() => false)
    if (themeVisible) {
      await expect(this.themeTrigger).toBeVisible()
    } else {
      await expect(this.docsToggle).toBeVisible()
      await expect(this.page.getByTestId('toggle-sidebar-button')).toBeVisible()
    }
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
    // New page opens in template-picker state; wait for it to appear
    await expect(this.page.getByTestId('template-gallery')).toBeVisible()
  }

  async renameLastPage(name: string) {
    await this.openPagesMenu()
    await this.page.getByTestId('page-rename-button').last().click()
    const input = this.page.locator('[data-testid="pages-dropdown-list"] input').last()
    await input.fill(name)
    await input.press('Enter')
  }

  async selectPage(number: number) {
    await this.openPagesMenu()
    await this.page.getByTestId('page-item').nth(number - 1).click()
    // Dropdown closes; wait for the canvas to show content for the selected page
    await expect(this.page.getByTestId('canvas-root')).toBeVisible()
  }

  async deleteLastPage() {
    await this.openPagesMenu()
    await this.page.getByTestId('page-delete-button').last().click()
    // Dropdown closes after deletion; wait for canvas-root to confirm app is stable
    await expect(this.page.getByTestId('canvas-root')).toBeVisible()
  }

  async toggleDocs() {
    await this.docsToggle.click()
  }

  async toggleColorMode() {
    const wasDark = await this.page.evaluate(() => document.documentElement.classList.contains('dark'))
    await this.modeToggle.click()
    // Wait for the color mode class to flip
    await expect.poll(() => this.page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!wasDark)
  }

  async chooseTheme(themeValue: string) {
    await this.themeTrigger.click()
    const list = this.page.getByTestId('theme-dropdown-list')
    await expect(list).toBeVisible()
    await this.page.locator(`[data-theme-value="${themeValue}"]`).click()
    // Wait for the dropdown to close
    await expect(list).toBeHidden()
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
    // Wait for the restored state: a diagram node must exist
    await expect(this.page.getByTestId('diagram-node').first()).toBeVisible({ timeout: 10000 })
  }

  async copyShareLink() {
    await this.shareButton.click()
    // clipboard write is synchronous on the JS side; read immediately
    return this.page.evaluate(() => navigator.clipboard.readText())
  }

  async resetWorkspace() {
    await this.resetButton.click()
    await expect(this.page.getByTestId('reset-workspace-confirm-button')).toBeVisible()
    await this.page.getByTestId('reset-workspace-confirm-button').click()
    // Wait for the workspace to reset to the fresh template-gallery state
    await expect(this.page.getByTestId('template-gallery')).toBeVisible({ timeout: 10000 })
  }

  async openResetWorkspaceDialog() {
    await this.resetButton.click()
    await expect(this.page.getByRole('dialog')).toContainText('Reset workspace?')
  }

  async cancelResetWorkspace() {
    await this.page.getByRole('button', { name: 'Cancel' }).click()
    await expect(this.page.getByRole('dialog')).toHaveCount(0)
  }

  async shouldShowActivePageNamed(name: string) {
    await this.openPagesMenu()
    await expect(this.page.getByTestId('page-item-active')).toContainText(name)
  }

  async shouldShowInactivePageCount(count: number) {
    await this.openPagesMenu()
    await expect(this.page.getByTestId('page-item')).toHaveCount(count)
  }

  async openMcpPanel() {
    await this.mcpButton.click()
    await expect(this.page.getByTestId('mcp-panel')).toBeVisible()
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
    // Wait for the diagram node's SVG to appear (template applied and rendered)
    await expect(this.page.locator('[data-testid="diagram-node"] svg').first()).toBeVisible({ timeout: 10000 })
  }
}

class CanvasSurface {
  constructor(private readonly page: Page) {}

  get root() { return this.page.getByTestId('canvas-root') }
  get addDiagramButton() { return this.page.getByTestId('add-diagram-button') }
  get mobileAddDiagramButton() { return this.page.getByTestId('mobile-add-diagram-button') }
  get nodes() { return this.page.getByTestId('diagram-node') }
  get firstNode() { return this.nodes.first() }

  async shouldBeVisible() {
    await expect(this.root).toBeVisible()
    const desktopAddVisible = await this.addDiagramButton.isVisible().catch(() => false)
    if (desktopAddVisible) {
      await expect(this.addDiagramButton).toBeVisible()
    } else {
      await expect(this.mobileAddDiagramButton).toBeVisible()
    }
  }

  async createDiagram() {
    await this.addDiagramButton.click()
    // Wait for the template gallery to appear for the new diagram slot
    await expect(this.page.getByTestId('template-gallery')).toBeVisible()
  }

  async createDiagramOnMobile() {
    await this.mobileAddDiagramButton.click()
    // Wait for the template gallery to appear for the new diagram slot
    await expect(this.page.getByTestId('template-gallery')).toBeVisible()
  }

  async shouldShowDiagramCount(count: number) {
    await expect(this.nodes).toHaveCount(count)
  }

  async selectDiagram(number: number) {
    await this.nodes.nth(number - 1).click()
  }

  async renameDiagram(number: number, name: string) {
    const input = this.page.getByTestId('diagram-name-input').nth(number - 1)
    await input.fill(name)
    await input.press('Enter')
  }

  async shouldBringDiagramIntoView(number: number) {
    const viewport = this.page.viewportSize()
    expect(viewport).toBeTruthy()
    await expect.poll(async () => {
      const box = await this.nodes.nth(number - 1).boundingBox()
      if (!box || !viewport) return false
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height
    }).toBe(true)
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
    const countBefore = await this.nodes.count()
    await this.page.keyboard.press('Control+t')
    // Wait for the new diagram node to appear
    await expect(this.nodes).toHaveCount(countBefore + 1)
  }

  async copyFromContextMenu() {
    await this.page.getByTestId('context-copy-button').click()
  }

  async duplicateFromContextMenu() {
    const countBefore = await this.nodes.count()
    await this.page.getByTestId('context-duplicate-button').click()
    // Wait for the duplicated diagram node to appear
    await expect(this.nodes).toHaveCount(countBefore + 1)
  }

  async copyShareLinkFromContextMenu() {
    await this.page.getByRole('button', { name: 'Share link' }).click()
    // clipboard write is synchronous on the JS side; read immediately
    return this.page.evaluate(() => navigator.clipboard.readText())
  }

  async deleteFromContextMenu() {
    const countBefore = await this.nodes.count()
    await this.page.getByTestId('context-delete-button').click()
    // Wait for the diagram node to be removed
    await expect(this.nodes).toHaveCount(countBefore - 1)
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
  get diagramNames() { return this.page.getByTestId('diagram-name-input') }
  get diagramDescriptions() { return this.page.getByTestId('diagram-description-input') }

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
    // Wait for Mermaid to re-render the SVG after code change
    await expect(this.svgPreview).toBeVisible({ timeout: 10000 })
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

  async renameDiagram(number: number, name: string) {
    const input = this.diagramNames.nth(number - 1)
    await input.fill(name)
    await input.press('Enter')
  }

  async describeDiagram(number: number, description: string) {
    const input = this.diagramDescriptions.nth(number - 1)
    await input.fill(description)
    await input.press('Enter')
  }

  async shouldRememberDiagramDetails(number: number, details: { name: string; description: string }) {
    await expect(this.diagramNames.nth(number - 1)).toHaveValue(details.name)
    await expect(this.diagramDescriptions.nth(number - 1)).toHaveValue(details.description)
  }

  async collapse() {
    await this.page.getByRole('button', { name: 'Collapse editor panel' }).click()
    await expect(this.page.getByRole('button', { name: 'Expand editor panel' })).toBeVisible()
  }

  async expand() {
    await this.page.getByRole('button', { name: 'Expand editor panel' }).click()
    await expect(this.page.getByRole('button', { name: 'Collapse editor panel' })).toBeVisible()
  }
}

class DiagramPicker {
  constructor(private readonly page: Page) {}

  get trigger() { return this.page.getByTestId('diagram-selector-trigger') }

  async chooseDiagram(number: number) {
    await this.trigger.click()
    await this.page.getByTestId(`diagram-selector-item-${number}`).click()
  }

  async shouldShowCurrentDiagramNamed(name: string) {
    await expect(this.trigger).toContainText(name)
  }
}

class MobileShell {
  constructor(private readonly page: Page) {}

  get backdrop() { return this.page.getByTestId('mobile-overlay-backdrop') }
  get addDiagramButton() { return this.page.getByTestId('mobile-add-diagram-button') }

  async shouldShowPrimaryControls() {
    // On mobile, file buttons (open/save) are hidden to save header space.
    // The essential controls are: editor toggle, docs toggle, mode toggle, and the FAB.
    await expect(this.page.getByTestId('toggle-sidebar-button')).toBeVisible()
    await expect(this.page.getByTestId('toggle-docs-button')).toBeVisible()
    await expect(this.page.getByTestId('toggle-mode-button')).toBeVisible()
    await expect(this.addDiagramButton).toBeVisible()
  }

  async shouldKeepCanvasClear() {
    await expect(this.backdrop).toHaveCount(0)
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
    // Wait for insert buttons to appear after expanding
    await expect(this.page.getByTestId('reference-insert-button').first()).toBeVisible()
  }

  async insertExample(label: string) {
    const btn = this.page.locator(`[data-testid="reference-insert-button"][data-reference-label="${label}"]`).first()
    await btn.click()
    // Wait for the button to flip to "inserted" state confirming the code was applied
    await expect(this.page.locator(`[data-testid="reference-insert-button-inserted"][data-reference-label="${label}"]`).first()).toBeVisible()
  }

  async insertFirstVisibleExample() {
    const btn = this.page.getByTestId('reference-insert-button').first()
    await btn.click()
    // Wait for the editor to become visible, confirming the code was injected
    await expect(this.page.locator('.cm-editor')).toBeVisible()
  }
}

export class PrettyFishApp {
  readonly header: HeaderBar
  readonly templates: TemplatePicker
  readonly canvas: CanvasSurface
  readonly editor: EditorSidebar
  readonly export: ExportPopoverPanel
  readonly docs: ReferenceDocsPanel
  readonly diagramPicker: DiagramPicker
  readonly mobile: MobileShell
  constructor(readonly page: Page) {
    this.header = new HeaderBar(page)
    this.templates = new TemplatePicker(page)
    this.canvas = new CanvasSurface(page)
    this.editor = new EditorSidebar(page)
    this.export = new ExportPopoverPanel(page)
    this.docs = new ReferenceDocsPanel(page)
    this.diagramPicker = new DiagramPicker(page)
    this.mobile = new MobileShell(page)
  }

  async openFresh() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(this.page.getByTestId('app-root')).toBeVisible({ timeout: 15000 })
    await this.page.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()
      await new Promise<void>((resolve) => {
        const request = indexedDB.open('prettyfish-db')
        request.onerror = () => resolve()
        request.onupgradeneeded = () => resolve()
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('app-state')) {
            db.close()
            resolve()
            return
          }
          const tx = db.transaction('app-state', 'readwrite')
          tx.objectStore('app-state').clear()
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            resolve()
          }
        }
      })
    })
    await this.page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(this.page.getByTestId('app-root')).toBeVisible({ timeout: 15000 })
    await this.header.shouldBeVisible()
    await this.canvas.shouldBeVisible()
    // Wait for the app to fully settle: on desktop the sidebar template gallery should be visible
    // (fresh empty diagram with no code). On mobile the sidebar is hidden by default so we skip this.
    const isMobile = await this.page.evaluate(() => window.innerWidth < 768)
    if (!isMobile) {
      // Desktop: sidebar is open by default showing template-gallery for the empty diagram
      await expect(this.templates.root).toBeVisible({ timeout: 10000 })
    } else {
      // Mobile: sidebar is hidden; wait for the canvas root to be interactive
      await expect(this.canvas.root).toBeVisible()
    }
  }

  async startFlowchartDiagram() {
    const templateVisible = await this.templates.root.isVisible().catch(() => false)
    if (!templateVisible) {
      // Ensure the sidebar is open so the template gallery can appear
      const toggleSidebar = this.page.getByTestId('toggle-sidebar-button')
      if (await toggleSidebar.isVisible().catch(() => false)) {
        await toggleSidebar.click()
      }
      // Wait for the template gallery to appear after sidebar opens
      const templateAfterOpen = await expect(this.templates.root)
        .toBeVisible({ timeout: 5000 })
        .then(() => true)
        .catch(() => false)
      // If still not visible, an empty diagram slot doesn't exist yet — create one
      if (!templateAfterOpen) {
        const desktopAddVisible = await this.canvas.addDiagramButton.isVisible().catch(() => false)
        const mobileAddVisible = await this.canvas.mobileAddDiagramButton.isVisible().catch(() => false)
        if (desktopAddVisible) {
          await this.canvas.createDiagram()
        } else if (mobileAddVisible) {
          await this.canvas.createDiagramOnMobile()
        }
      }
      await this.templates.shouldBeVisible()
    }
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
  }

  async redo() {
    await this.page.keyboard.press('Control+Shift+z')
  }

  async resetWorkspace() {
    await this.header.resetWorkspace()
  }
}


export function createApp(page: Page) {
  return new PrettyFishApp(page)
}
