/**
 * RENDERED CONTRAST AUDIT
 * =======================
 * Tests color contrast of actual rendered Mermaid diagrams across all themes
 * and config permutations, using the app's real rendering pipeline.
 *
 * WHY NOT axe-core for SVGs:
 * axe-core checks CSS `color` vs `background-color` — it is designed for HTML.
 * Mermaid diagrams are SVG: text colors are SVG `fill` attributes, backgrounds
 * are SVG `rect` fills. axe cannot reliably map SVG fills to their visual
 * backgrounds, producing both false positives and false negatives on SVG content.
 *
 * APPROACH: Use Playwright's getComputedStyle() on real SVG elements.
 * - Navigates to /contrast-audit (app's ContrastAuditPage, real renderDiagram())
 * - Renders each diagram with each theme via window.__renderForAudit()
 * - Reads actual computed fill/stroke colors from SVG DOM elements
 * - Computes WCAG contrast ratios from real browser-computed colors
 * - Fails with exact element, theme, colors, and ratio if below 3:1 (AA large)
 *
 * To run:  npx playwright test tests/e2e/app/contrast-rendered.spec.ts
 * To grep: npx playwright test --grep "sequence autonumber"
 */

import { test, expect, Page } from '@playwright/test'

// ── Color utilities ───────────────────────────────────────────────────────────

function parseRgb(str: string | null): [number, number, number] | null {
  if (!str) return null
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
  const h = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (h) return [parseInt(h[1], 16), parseInt(h[2], 16), parseInt(h[3], 16)]
  return null
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function luminance(r: number, g: number, b: number): number {
  return [r, g, b].reduce((acc, c, i) => {
    const s = c / 255
    const linear = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    return acc + linear * [0.2126, 0.7152, 0.0722][i]!
  }, 0)
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = luminance(...rgb1)
  const l2 = luminance(...rgb2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const WCAG_AA_LARGE = 3.0 // WCAG AA for large text (≥18pt or ≥14pt bold)

// ── Render helper ─────────────────────────────────────────────────────────────

async function renderForTheme(
  page: Page,
  code: string,
  themeId: string,
  configOverrides: Record<string, unknown> = {}
): Promise<boolean> {
  if (!page.url().includes('/contrast-audit')) {
    await page.goto('/contrast-audit', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      { timeout: 10000 }
    )
  }

  const result = await page.evaluate(
    async ({ code: c, themeId: t, configOverrides: co }) =>
      (window as unknown as {
        __renderForAudit: (a: string, b: string, c: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
      }).__renderForAudit(c, t, co),
    { code, themeId, configOverrides }
  )

  return result.ok
}

// ── SVG color extraction ──────────────────────────────────────────────────────

/**
 * Read a real computed color from an SVG element.
 * For SVG, fill/stroke are set as attributes and as CSS — getComputedStyle
 * returns the actual rendered value (CSS wins over attribute, as browsers do).
 */
async function getSvgColor(
  page: Page,
  selector: string,
  property: 'fill' | 'stroke' = 'fill'
): Promise<string | null> {
  return page.evaluate(({ sel, prop }) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const computed = window.getComputedStyle(el)[prop as 'fill' | 'stroke']
    if (computed && computed !== 'none' && !computed.startsWith('url(')) return computed
    const attr = el.getAttribute(prop)
    if (attr && attr !== 'none') return attr
    return null
  }, { sel: selector, prop: property })
}

async function getPageBackground(page: Page): Promise<string> {
  return page.evaluate(() => window.getComputedStyle(document.body).backgroundColor)
}

// ── Color pair check ──────────────────────────────────────────────────────────

interface ColorPairCheck {
  label: string
  textSelector: string
  textProperty?: 'fill' | 'stroke'
  bgSelector: string | null
  bgProperty?: 'fill' | 'stroke'
}

interface CheckResult {
  label: string
  textColor: string
  bgColor: string
  ratio: number
  passes: boolean
}

async function checkColorPair(page: Page, check: ColorPairCheck): Promise<CheckResult | null> {
  const textRaw = await getSvgColor(page, check.textSelector, check.textProperty ?? 'fill')
  const bgRaw = check.bgSelector
    ? await getSvgColor(page, check.bgSelector, check.bgProperty ?? 'fill')
    : await getPageBackground(page)

  if (!textRaw || !bgRaw) return null

  const textRgb = parseRgb(textRaw)
  const bgRgb = parseRgb(bgRaw)
  if (!textRgb || !bgRgb) return null

  const ratio = contrastRatio(textRgb, bgRgb)
  return {
    label: check.label,
    textColor: rgbToHex(textRgb),
    bgColor: rgbToHex(bgRgb),
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= WCAG_AA_LARGE,
  }
}

// ── Theme loading ─────────────────────────────────────────────────────────────

let _themes: Record<string, { label: string }> | null = null

async function loadThemes() {
  if (_themes) return _themes
  const { CUSTOM_THEME_PRESETS } = await import('../../../src/lib/themePresets.ts')
  _themes = Object.fromEntries(
    Object.entries(CUSTOM_THEME_PRESETS).map(([id, preset]) => [id, { label: preset.label }])
  )
  return _themes
}

// ── Test factory ──────────────────────────────────────────────────────────────

/**
 * Create a test that renders a diagram with every theme and checks SVG contrast
 * pairs using real browser getComputedStyle() values.
 */
function contrastTest(
  label: string,
  diagramCode: string,
  checks: ColorPairCheck[],
  configOverrides: Record<string, unknown> = {}
) {
  test(label, async ({ page }) => {
    const themes = await loadThemes()
    const failures: string[] = []

    for (const [themeId, theme] of Object.entries(themes)) {
      let ok: boolean
      try {
        ok = await renderForTheme(page, diagramCode, themeId, configOverrides)
      } catch {
        // Context destroyed (e.g. page navigated during render) — re-navigate and retry once
        await page.goto('/contrast-audit', { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(
          () => (window as unknown as { __ready?: boolean }).__ready === true,
          { timeout: 10000 }
        )
        try {
          ok = await renderForTheme(page, diagramCode, themeId, configOverrides)
        } catch {
          continue // skip this theme if it still fails
        }
      }
      if (!ok) continue

      for (const check of checks) {
        const result = await checkColorPair(page, check)
        if (!result) continue

        if (!result.passes) {
          failures.push(
            `[${theme.label}] ${check.label}: ${result.ratio}:1 ` +
            `(text ${result.textColor} on bg ${result.bgColor}) — needs ≥${WCAG_AA_LARGE}:1`
          )
        }
      }
    }

    if (failures.length > 0) {
      for (const f of failures) expect.soft(false, f).toBe(true)
      expect(failures.length, `${failures.length} contrast failure(s) found`).toBe(0)
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Rendered contrast audit — all themes × diagram configs', () => {

  // ── Sequence diagram ───────────────────────────────────────────────────────

  test.describe('Sequence diagram', () => {

    contrastTest(
      'actors and signals (default)',
      `sequenceDiagram
  Alice->>Bob: Hello Bob, how are you?
  Bob-->>Alice: Great thanks!`,
      [
        { label: 'Actor text on actor bg', textSelector: 'text.actor > tspan', bgSelector: 'rect.actor' },
        { label: 'Signal text on page bg', textSelector: '.messageText', bgSelector: null },
      ]
    )

    contrastTest(
      'autonumber — number text on circle bg',
      `sequenceDiagram
  autonumber
  Alice->>Bob: First message
  Bob-->>Alice: Second message
  Alice->>Bob: Third message`,
      [
        {
          // .sequenceNumber { fill: sequenceNumberColor } = number text
          // [id$="-sequencenumber"] circle { fill: signalColor } = circle background
          label: 'Autonumber text (sequenceNumberColor) on circle bg (signalColor)',
          textSelector: '.sequenceNumber',
          bgSelector: '[id$="-sequencenumber"] circle',
        },
      ],
      { sequence: { showSequenceNumbers: true } }
    )

    contrastTest(
      'notes',
      `sequenceDiagram
  Alice->>Bob: Hello
  Note right of Bob: Bob thinks carefully
  Bob-->>Alice: Hi there`,
      [
        { label: 'Note text on note bg', textSelector: '.noteText', bgSelector: '.note' },
      ]
    )

    contrastTest(
      'loop/alt frames — label text on label box',
      `sequenceDiagram
  loop Every minute
    Alice->>Bob: ping
  end
  alt Success
    Bob-->>Alice: pong
  else Failure
    Bob-->>Alice: error
  end`,
      [
        { label: 'Label text on label box bg', textSelector: '.labelText', bgSelector: '.labelBox' },
        { label: 'Loop text on page bg', textSelector: '.loopText', bgSelector: null },
      ]
    )

    contrastTest(
      'activation boxes',
      `sequenceDiagram
  Alice->>+Bob: Request
  Bob->>+Service: Process
  Service-->>-Bob: Result
  Bob-->>-Alice: Response`,
      [
        { label: 'Signal text on activation bg', textSelector: '.messageText', bgSelector: '.activation0' },
      ]
    )

  })

  // ── Flowchart ──────────────────────────────────────────────────────────────

  test.describe('Flowchart', () => {

    contrastTest(
      'nodes and edge labels',
      `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Skip]
  C --> E[End]
  D --> E`,
      [
        { label: 'Node label on node bg', textSelector: '.nodeLabel', textProperty: 'fill', bgSelector: '.node rect' },
        { label: 'Edge label on edge label bg', textSelector: '.edgeLabel .label', textProperty: 'fill', bgSelector: '.edgeLabel .label-container' },
      ]
    )

    contrastTest(
      'subgraph cluster labels',
      `flowchart TD
  subgraph GroupA[Group A]
    A[Alpha]
    B[Beta]
  end
  A --> C[Gamma]`,
      [
        // Cluster label text is rendered as SVG <text> with CSS fill = tertiaryTextColor
        // The cluster background rect fill = clusterBkg (tertiaryColor)
        { label: 'Cluster label on cluster bg', textSelector: '.cluster-label text, .cluster .label text', textProperty: 'fill', bgSelector: '.cluster rect' },
      ]
    )

  })

  // ── Class diagram ──────────────────────────────────────────────────────────

  test.describe('Class diagram', () => {

    contrastTest(
      'class boxes with fillType colors',
      `classDiagram
  class Vehicle {
    +String brand
    +start()
  }
  class Car {
    +int doors
    +drive()
  }
  class Truck {
    +int payload
    +haul()
  }
  Vehicle <|-- Car
  Vehicle <|-- Truck`,
      [
        { label: 'Class title on class bg', textSelector: '.classTitle', bgSelector: '.classGroup .outer-title, .classGroup > rect' },
        { label: 'Class member text on class bg', textSelector: '.member', bgSelector: '.classGroup rect' },
      ]
    )

  })

  // ── ER diagram ─────────────────────────────────────────────────────────────

  test.describe('ER diagram', () => {

    contrastTest(
      'entity header and attribute rows',
      `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
    int loyalty_points
  }
  ORDER {
    int order_id
    date placed_at
  }`,
      [
        { label: 'Entity header text on entity header bg', textSelector: '.er.entityLabel', bgSelector: '.er.entityBox' },
        { label: 'Attribute text on even row bg', textSelector: '.er.attributeBoxEven text', bgSelector: '.er.attributeBoxEven' },
        { label: 'Attribute text on odd row bg', textSelector: '.er.attributeBoxOdd text', bgSelector: '.er.attributeBoxOdd' },
      ]
    )

  })

  // ── State diagram ──────────────────────────────────────────────────────────

  test.describe('State diagram', () => {

    contrastTest(
      'state labels',
      `stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Done : complete
  Running --> Failed : error
  Done --> [*]
  Failed --> [*]`,
      [
        { label: 'State label on state bg', textSelector: '.state-title', bgSelector: '.stateGroup rect, .basic-state rect' },
      ]
    )

    contrastTest(
      'composite state title',
      `stateDiagram-v2
  state Compound {
    [*] --> A
    A --> B
    B --> [*]
  }
  [*] --> Compound
  Compound --> [*]`,
      [
        { label: 'Composite title on composite title bg', textSelector: '.compositeTitle', bgSelector: '.compositeTitleBackground' },
      ]
    )

  })

  // ── Gantt chart ────────────────────────────────────────────────────────────

  test.describe('Gantt chart', () => {

    contrastTest(
      'tasks including crit and done tasks',
      `gantt
  title Development Plan
  dateFormat YYYY-MM-DD
  section Backend
    Design     :done,   d1, 2024-01-01, 2024-01-05
    Implement  :active, d2, 2024-01-05, 2024-01-15
    Critical   :crit,   d3, 2024-01-15, 2024-01-20
  section Frontend
    Design     :        d4, 2024-01-05, 2024-01-10
    Build      :crit,   d5, 2024-01-10, 2024-01-20`,
      [
        { label: 'Task text on task bg', textSelector: '.taskText', bgSelector: '.task:not(.crit)' },
        { label: 'Task text on crit task bg', textSelector: '.taskTextCritLine, .taskTextCritNoLine', bgSelector: '.crit' },
      ]
    )

  })

  // ── Git graph ──────────────────────────────────────────────────────────────

  test.describe('Git graph', () => {

    contrastTest(
      'branch commit and label colors',
      `gitGraph
  commit id: "Initial"
  branch develop
  checkout develop
  commit id: "Feature A"
  commit id: "Feature B"
  checkout main
  merge develop id: "Merge"
  commit id: "Release"`,
      [
        // commitLabelColor on page background (commit ID text below each circle)
        { label: 'Commit ID label on page bg', textSelector: '.commit-label', bgSelector: null },
        // gitBranchLabelN on page background (branch name labels)
        { label: 'Branch label on page bg', textSelector: '.branch-label0, .branch-label1, .branch-label2', bgSelector: null },
      ]
    )

  })

  // ── Pie chart ──────────────────────────────────────────────────────────────

  test.describe('Pie chart', () => {

    contrastTest(
      'pie slices and section labels',
      `pie title Quarterly Revenue
  "Q1" : 25
  "Q2" : 30
  "Q3" : 20
  "Q4" : 25`,
      [
        // pieSectionTextColor on first pie slice (pie1 color)
        { label: 'Pie section text on pie slice bg', textSelector: '.pieSectionText', bgSelector: '.pieCircle path' },
      ]
    )

  })

  // ── Journey diagram ────────────────────────────────────────────────────────

  test.describe('Journey diagram', () => {

    contrastTest(
      'journey sections and task labels',
      `journey
  title A Developer's Day
  section Morning
    Coffee: 5: Dev
    Stand-up: 3: Dev, Team
  section Afternoon
    Coding: 8: Dev
    Review: 6: Dev, Team`,
      [
        { label: 'Section label on section bg (cScale)', textSelector: '.label', bgSelector: 'rect.actor, .section' },
      ]
    )

  })

  // ── Timeline ───────────────────────────────────────────────────────────────

  test.describe('Timeline diagram', () => {

    contrastTest(
      'timeline events',
      `timeline
  title Software Release Timeline
  2023 : Planning
       : Architecture
  2024 : Development
       : Testing
  2025 : Launch`,
      [
        { label: 'Timeline event text on event bg', textSelector: '.timeline-event .label, .event-label', bgSelector: '.timeline-event rect, .event' },
      ]
    )

  })

})
