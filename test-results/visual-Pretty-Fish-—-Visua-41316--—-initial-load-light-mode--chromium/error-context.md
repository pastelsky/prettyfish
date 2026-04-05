# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Pretty Fish — Visual Tests >> 01 — initial load (light mode)
- Location: tests/visual.spec.ts:28:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="pages-dropdown-trigger"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="pages-dropdown-trigger"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - application [ref=e6]:
    - group [ref=e9]:
      - generic [ref=e10]:
        - textbox [ref=e12]: Diagram 1
        - textbox "Add description…" [ref=e14]
        - generic [ref=e16]: Select a diagram
    - img
    - generic "Control Panel" [ref=e17]:
      - button "Zoom In" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
      - button "Zoom Out" [ref=e21] [cursor=pointer]:
        - img [ref=e22]
      - button "Fit View" [ref=e24] [cursor=pointer]:
        - img [ref=e25]
    - img "Mini Map" [ref=e28]
  - generic:
    - generic [ref=e31]:
      - generic [ref=e33]: PrettyFish
      - generic [ref=e34]: Mermaid Diagram Editor
      - generic [ref=e36]:
        - button [ref=e37]:
          - button [ref=e38]:
            - img
        - button [ref=e39]:
          - button [ref=e40]:
            - img
      - button "Page 1" [ref=e43] [cursor=pointer]:
        - generic [ref=e44]: Page 1
        - img [ref=e45]
    - generic [ref=e47]:
      - button [ref=e48]:
        - button [ref=e49]:
          - img
      - generic [ref=e51]:
        - button "Export" [disabled]:
          - img
          - text: Export
      - button "Share" [ref=e52]:
        - button "Share" [ref=e53]:
          - img
          - text: Share
      - button "Default" [ref=e56] [cursor=pointer]:
        - generic [ref=e61]: Default
        - img [ref=e62]
      - button [ref=e64]:
        - button [ref=e65]:
          - img
      - button [ref=e67]:
        - button [ref=e68]:
          - img
      - button [ref=e69]:
        - button [ref=e70]:
          - img
  - generic [ref=e71]:
    - generic "Drag to resize" [ref=e72]
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - generic [ref=e77]: Editor
          - generic [ref=e78]: •
          - generic [ref=e79]: Diagram 1
        - button [ref=e80]:
          - button [ref=e81]:
            - img
      - generic [ref=e84]:
        - heading "Choose a diagram type" [level=2] [ref=e86]
        - generic [ref=e87]:
          - button "Flowchart Process flows, decision trees" [ref=e88] [cursor=pointer]:
            - img [ref=e90]
            - generic [ref=e95]:
              - generic [ref=e96]: Flowchart
              - generic [ref=e97]: Process flows, decision trees
          - button "Sequence Interactions between actors" [ref=e98] [cursor=pointer]:
            - img [ref=e100]
            - generic [ref=e106]:
              - generic [ref=e107]: Sequence
              - generic [ref=e108]: Interactions between actors
          - button "Class Diagram OOP structure and relationships" [ref=e109] [cursor=pointer]:
            - img [ref=e111]
            - generic [ref=e115]:
              - generic [ref=e116]: Class Diagram
              - generic [ref=e117]: OOP structure and relationships
          - button "ER Diagram Database entity relationships" [ref=e118] [cursor=pointer]:
            - img [ref=e120]
            - generic [ref=e125]:
              - generic [ref=e126]: ER Diagram
              - generic [ref=e127]: Database entity relationships
          - button "State Diagram State machines and transitions" [ref=e128] [cursor=pointer]:
            - img [ref=e130]
            - generic [ref=e140]:
              - generic [ref=e141]: State Diagram
              - generic [ref=e142]: State machines and transitions
          - button "Gantt Chart Project timelines and schedules" [ref=e143] [cursor=pointer]:
            - img [ref=e145]
            - generic [ref=e149]:
              - generic [ref=e150]: Gantt Chart
              - generic [ref=e151]: Project timelines and schedules
          - button "Pie Chart Proportions and distributions" [ref=e152] [cursor=pointer]:
            - img [ref=e154]
            - generic [ref=e159]:
              - generic [ref=e160]: Pie Chart
              - generic [ref=e161]: Proportions and distributions
          - button "Git Graph Git branch and commit history" [ref=e162] [cursor=pointer]:
            - img [ref=e164]
            - generic [ref=e172]:
              - generic [ref=e173]: Git Graph
              - generic [ref=e174]: Git branch and commit history
          - button "Mind Map Ideas, concepts and hierarchies" [ref=e175] [cursor=pointer]:
            - img [ref=e177]
            - generic [ref=e189]:
              - generic [ref=e190]: Mind Map
              - generic [ref=e191]: Ideas, concepts and hierarchies
          - button "Timeline Events across time periods" [ref=e192] [cursor=pointer]:
            - img [ref=e194]
            - generic [ref=e202]:
              - generic [ref=e203]: Timeline
              - generic [ref=e204]: Events across time periods
          - button "Quadrant Chart Feature prioritization matrix" [ref=e205] [cursor=pointer]:
            - img [ref=e207]
            - generic [ref=e212]:
              - generic [ref=e213]: Quadrant Chart
              - generic [ref=e214]: Feature prioritization matrix
          - button "XY Chart Bar and line charts with axes" [ref=e215] [cursor=pointer]:
            - img [ref=e217]
            - generic [ref=e223]:
              - generic [ref=e224]: XY Chart
              - generic [ref=e225]: Bar and line charts with axes
          - button "Architecture System architecture diagrams (beta)" [ref=e226] [cursor=pointer]:
            - img [ref=e228]
            - generic [ref=e233]:
              - generic [ref=e234]: Architecture
              - generic [ref=e235]: System architecture diagrams (beta)
          - button "Kanban Kanban boards with columns and cards" [ref=e236] [cursor=pointer]:
            - img [ref=e238]
            - generic [ref=e242]:
              - generic [ref=e243]: Kanban
              - generic [ref=e244]: Kanban boards with columns and cards
          - button "Sankey Flow diagrams showing quantities" [ref=e245] [cursor=pointer]:
            - img [ref=e247]
            - generic [ref=e259]:
              - generic [ref=e260]: Sankey
              - generic [ref=e261]: Flow diagrams showing quantities
          - button "Block Block diagrams with columns and sections" [ref=e262] [cursor=pointer]:
            - img [ref=e264]
            - generic [ref=e269]:
              - generic [ref=e270]: Block
              - generic [ref=e271]: Block diagrams with columns and sections
          - button "Packet Network packet structure diagrams" [ref=e272] [cursor=pointer]:
            - img [ref=e274]
            - generic [ref=e282]:
              - generic [ref=e283]: Packet
              - generic [ref=e284]: Network packet structure diagrams
          - button "User Journey Map user experiences across touchpoints" [ref=e285] [cursor=pointer]:
            - img [ref=e287]
            - generic [ref=e292]:
              - generic [ref=e293]: User Journey
              - generic [ref=e294]: Map user experiences across touchpoints
          - button "Requirement Requirements and their relationships" [ref=e295] [cursor=pointer]:
            - img [ref=e297]
            - generic [ref=e303]:
              - generic [ref=e304]: Requirement
              - generic [ref=e305]: Requirements and their relationships
          - button "Radar Radar/spider charts for comparison" [ref=e306] [cursor=pointer]:
            - img [ref=e308]
            - generic [ref=e316]:
              - generic [ref=e317]: Radar
              - generic [ref=e318]: Radar/spider charts for comparison
  - button "Add Diagram" [ref=e319]:
    - img
    - text: Add Diagram
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | import { fileURLToPath } from 'url'
  3   | import path from 'path'
  4   | import fs from 'fs'
  5   | 
  6   | const __dirname = path.dirname(fileURLToPath(import.meta.url))
  7   | const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')
  8   | 
  9   | async function screenshot(page: Page, name: string) {
  10  |   if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  11  |   await page.screenshot({
  12  |     path: path.join(SCREENSHOTS_DIR, `${name}.png`),
  13  |     fullPage: false,
  14  |   })
  15  |   console.log(`  📸 ${name}.png`)
  16  | }
  17  | 
  18  | async function waitForApp(page: Page) {
  19  |   await page.goto('/')
  20  |   await page.waitForLoadState('networkidle')
  21  |   // Wait for mermaid SVG to appear in the canvas
  22  |   await page.waitForSelector('svg', { timeout: 10000 })
  23  |   await page.waitForTimeout(800)
  24  | }
  25  | 
  26  | test.describe('Pretty Fish — Visual Tests', () => {
  27  | 
  28  |   test('01 — initial load (light mode)', async ({ page }) => {
  29  |     await waitForApp(page)
  30  |     await screenshot(page, '01-initial-light')
  31  |     // Header logo pill visible
  32  |     await expect(page.locator('[data-testid="header-logo-pill"]')).toBeVisible()
  33  |     // Pages dropdown trigger visible
> 34  |     await expect(page.locator('[data-testid="pages-dropdown-trigger"]')).toBeVisible()
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  35  |     // SVG diagram rendered
  36  |     await expect(page.locator('svg').first()).toBeVisible()
  37  |   })
  38  | 
  39  |   test('02 — dark mode', async ({ page }) => {
  40  |     await waitForApp(page)
  41  |     // Click moon/sun icon — it's the button with aria or SVG in the toolbar
  42  |     // Find the dark mode toggle button in the right toolbar pill
  43  |     const toolbar = page.locator('[class*="pointer-events-auto"]').filter({ hasText: /Export|Share/ }).first()
  44  |     // Moon icon button
  45  |     const moonBtn = toolbar.locator('button').nth(3) // Theme / dark / present / share / export / help
  46  |     await moonBtn.click()
  47  |     await page.waitForTimeout(500)
  48  |     await screenshot(page, '02-dark-mode')
  49  |   })
  50  | 
  51  |   test('03 — pages dropdown open + hover states', async ({ page }) => {
  52  |     await waitForApp(page)
  53  |     await page.locator('[data-testid="pages-dropdown-trigger"]').click()
  54  |     await page.waitForTimeout(300)
  55  |     await expect(page.locator('[data-testid="pages-dropdown-list"]')).toBeVisible()
  56  |     await screenshot(page, '03-pages-dropdown-open')
  57  |     // Close it
  58  |     await page.keyboard.press('Escape')
  59  |     await page.waitForTimeout(200)
  60  |   })
  61  | 
  62  |   test('04 — create new page → template gallery', async ({ page }) => {
  63  |     await waitForApp(page)
  64  |     await page.locator('[data-testid="pages-dropdown-trigger"]').click()
  65  |     await page.waitForTimeout(200)
  66  |     // Find and click the New diagram button
  67  |     await page.locator('[data-testid="pages-new-diagram"]').click()
  68  |     await page.waitForTimeout(400)
  69  |     await screenshot(page, '04-template-gallery')
  70  |     // Template gallery heading visible
  71  |     await expect(page.getByText('Cast your net')).toBeVisible()
  72  |   })
  73  | 
  74  |   test('05 — template selection → renders diagram', async ({ page }) => {
  75  |     await waitForApp(page)
  76  |     // Open new page
  77  |     await page.locator('[data-testid="pages-dropdown-trigger"]').click()
  78  |     await page.locator('[data-testid="pages-dropdown-list"]').getByText('New diagram').click()
  79  |     await page.waitForTimeout(300)
  80  |     // Click Git Graph template
  81  |     await page.getByText('Git Graph').click()
  82  |     await page.waitForTimeout(2000)
  83  |     await screenshot(page, '05-git-graph-template')
  84  |     // SVG should render
  85  |     await expect(page.locator('svg').first()).toBeVisible()
  86  |   })
  87  | 
  88  |   test('06 — editor typing updates diagram', async ({ page }) => {
  89  |     await waitForApp(page)
  90  |     const editor = page.locator('.cm-content').first()
  91  |     await editor.click()
  92  |     await page.keyboard.press('Control+A')
  93  |     await page.waitForTimeout(100)
  94  |     await page.keyboard.type('flowchart LR\n  Start --> End')
  95  |     await page.waitForTimeout(2000)
  96  |     await screenshot(page, '06-editor-updates-diagram')
  97  |   })
  98  | 
  99  |   test('07 — settings tab', async ({ page }) => {
  100 |     await waitForApp(page)
  101 |     // Settings tab is the gear icon — it's the 2nd icon button in the sidebar toolbar
  102 |     const sidebarPanel = page.locator('[data-sidebar-panel]')
  103 |     const gearBtn = sidebarPanel.locator('button').nth(1) // 0=code, 1=settings
  104 |     await gearBtn.click()
  105 |     await page.waitForTimeout(300)
  106 |     await screenshot(page, '07-settings-tab')
  107 |   })
  108 | 
  109 |   test('08 — theme selector dropdown', async ({ page }) => {
  110 |     await waitForApp(page)
  111 |     // Theme button is in the right toolbar
  112 |     const themeBtn = page.locator('button').filter({ has: page.locator('text=Default') }).first()
  113 |     await themeBtn.click()
  114 |     await page.waitForTimeout(200)
  115 |     await screenshot(page, '08-theme-dropdown')
  116 |     // Switch to Amethyst
  117 |     await page.getByText('Amethyst').click()
  118 |     await page.waitForTimeout(1200)
  119 |     await screenshot(page, '08b-amethyst-theme')
  120 |   })
  121 | 
  122 |   test('09 — export popover', async ({ page }) => {
  123 |     await waitForApp(page)
  124 |     await page.waitForTimeout(1500)
  125 |     // Export button
  126 |     const exportBtn = page.locator('button').filter({ has: page.locator('text=Export') }).first()
  127 |     await exportBtn.click()
  128 |     await page.waitForTimeout(300)
  129 |     await screenshot(page, '09-export-popover')
  130 |   })
  131 | 
  132 |   test('10 — reference docs panel', async ({ page }) => {
  133 |     await waitForApp(page)
  134 |     // Books icon button in the right toolbar
```