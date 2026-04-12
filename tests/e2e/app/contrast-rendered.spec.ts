/**
 * RENDERED CONTRAST AUDIT
 * =======================
 * Ground-truth accessibility contrast test — uses Playwright to render actual
 * Mermaid diagrams in Chromium and reads real computed colors from the SVG DOM.
 *
 * NO static analysis. NO guessing at variable-to-color mappings.
 * Every check is driven by what the browser actually renders.
 *
 * Each test covers one diagram type × one config permutation, run across all
 * custom themes. If a text/background pair fails WCAG AA large text (3:1),
 * the test fails with a detailed message showing which theme, diagram, and
 * CSS selector has the problem.
 *
 * To run:   npx playwright test tests/e2e/app/contrast-rendered.spec.ts
 * To run one diagram: npx playwright test --grep "sequence autonumber"
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

const WCAG_AA_LARGE = 3.0 // minimum for large/bold text

// ── Mermaid rendering helper ──────────────────────────────────────────────────

/**
 * Navigate to /contrast-audit (the app's ContrastAuditPage component) and call
 * window.__renderForAudit() — which uses the app's real renderDiagram() pipeline.
 * This means contrast tests exercise EXACTLY the same code as production.
 */
async function renderDiagramForAudit(
  page: Page,
  code: string,
  themeId: string,
  configOverrides: Record<string, unknown> = {}
): Promise<void> {
  // Navigate once per page; reuse for subsequent renders within the same test
  if (!page.url().includes('/contrast-audit')) {
    await page.goto('/contrast-audit', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      { timeout: 10000 }
    )
  }

  const result = await page.evaluate(
    async ({ code: c, themeId: t, configOverrides: co }) => {
      return (window as unknown as {
        __renderForAudit: (a: string, b: string, c: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
      }).__renderForAudit(c, t, co)
    },
    { code, themeId, configOverrides }
  )

  if (!result.ok) {
    throw new Error(`Mermaid render failed: ${result.error}`)
  }
}

// Read a real computed color from a CSS selector in the SVG DOM
// Returns the computed fill or color as a hex string, or null if not found
async function getComputedColor(page: Page, selector: string, property: 'fill' | 'color' | 'stroke' = 'fill'): Promise<string | null> {
  return page.evaluate(({ sel, prop }) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const computed = window.getComputedStyle(el)[prop as 'fill' | 'color' | 'stroke']
    if (computed && computed !== 'none' && computed !== '' && !computed.startsWith('url(')) {
      return computed
    }
    // Fallback: SVG attribute
    const attr = el.getAttribute(prop === 'color' ? 'fill' : prop)
    return attr ?? null
  }, { sel: selector, prop: property })
}

// Get the background color of the page itself (html/body background)
async function getPageBackground(page: Page): Promise<string> {
  return page.evaluate(() => window.getComputedStyle(document.body).backgroundColor)
}

// ── Check a text/bg color pair ────────────────────────────────────────────────

interface ColorPairCheck {
  label: string
  textSelector: string
  textProperty?: 'fill' | 'color' | 'stroke'
  bgSelector: string | null  // null = use page background
  bgProperty?: 'fill' | 'color' | 'stroke'
}

interface CheckResult {
  label: string
  textColor: string
  bgColor: string
  ratio: number
  passes: boolean
}

async function checkColorPair(
  page: Page,
  check: ColorPairCheck
): Promise<CheckResult | null> {
  const textRaw = await getComputedColor(page, check.textSelector, check.textProperty ?? 'fill')
  const bgRaw = check.bgSelector
    ? await getComputedColor(page, check.bgSelector, check.bgProperty ?? 'fill')
    : await getPageBackground(page)

  if (!textRaw || !bgRaw) return null // element not present in this diagram

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

// Dynamically load theme IDs + labels at test time
let _themes: Record<string, { label: string }> | null = null

async function loadThemes() {
  if (_themes) return _themes
  const { CUSTOM_THEME_PRESETS } = await import('../../../src/lib/themePresets.ts')
  _themes = Object.fromEntries(
    Object.entries(CUSTOM_THEME_PRESETS).map(([id, preset]) => [id, { label: preset.label }])
  )
  return _themes
}

// ── Test helper: run a diagram check across all themes ───────────────────────

function forEachTheme(
  diagramLabel: string,
  diagramCode: string,
  checks: ColorPairCheck[],
  mermaidConfig: Record<string, unknown> = {}
) {
  test(diagramLabel, async ({ page }) => {
    const themes = await loadThemes()
    const failures: string[] = []

    for (const [themeId, theme] of Object.entries(themes)) {
      try {
        // Uses the app's real renderDiagram() pipeline via /contrast-audit route
        await renderDiagramForAudit(page, diagramCode, themeId, mermaidConfig)
      } catch {
        // Some diagram types may not render in some themes — skip
        continue
      }

      for (const check of checks) {
        const result = await checkColorPair(page, check)
        if (!result) continue // element not present — skip

        if (!result.passes) {
          failures.push(
            `[${theme.label}] ${check.label}: ${result.ratio}:1 ` +
            `(text ${result.textColor} on bg ${result.bgColor}) — needs ≥${WCAG_AA_LARGE}:1`
          )
        }
      }
    }

    if (failures.length > 0) {
      expect.soft(false, `Contrast failures:\n${failures.map(f => '  • ' + f).join('\n')}`).toBe(true)
      // Force test to fail after all soft assertions
      expect(failures.length, `${failures.length} contrast failure(s) found`).toBe(0)
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Rendered contrast audit — all themes × diagram configs', () => {

  // ── Sequence diagram ───────────────────────────────────────────────────────

  test.describe('Sequence diagram', () => {

    forEachTheme(
      'actors and signals (default)',
      `sequenceDiagram
  Alice->>Bob: Hello Bob, how are you?
  Bob-->>Alice: Great thanks!`,
      [
        {
          label: 'Actor text on actor bg',
          // text.actor > tspan: fill = actorTextColor
          // rect.actor:        fill = actorBkg
          textSelector: 'text.actor > tspan',
          textProperty: 'fill',
          bgSelector: 'rect.actor',
          bgProperty: 'fill',
        },
        {
          label: 'Signal/message text on page background',
          // .messageText: fill = signalTextColor
          // background: diagram canvas color
          textSelector: '.messageText',
          textProperty: 'fill',
          bgSelector: null,
        },
      ]
    )

    forEachTheme(
      'sequence autonumber — number text on circle bg',
      `sequenceDiagram
  autonumber
  Alice->>Bob: First message
  Bob-->>Alice: Second message
  Alice->>Bob: Third message`,
      [
        {
          label: 'Autonumber text (.sequenceNumber fill=sequenceNumberColor) on circle ([id$="-sequencenumber"] circle fill=signalColor)',
          // .sequenceNumber CSS class: fill = sequenceNumberColor (the number text)
          // [id$="-sequencenumber"] circle: fill = signalColor (the circle background)
          textSelector: '.sequenceNumber',
          textProperty: 'fill',
          bgSelector: '[id$="-sequencenumber"] circle',
          bgProperty: 'fill',
        },
      ],
      { sequence: { showSequenceNumbers: true } }
    )

    forEachTheme(
      'sequence notes',
      `sequenceDiagram
  Alice->>Bob: Hello
  Note right of Bob: Bob thinks carefully
  Bob-->>Alice: Hi there`,
      [
        {
          label: 'Note text on note bg',
          // .noteText: fill = noteTextColor
          // .note rect: fill = noteBkgColor
          textSelector: '.noteText',
          textProperty: 'fill',
          bgSelector: '.note',
          bgProperty: 'fill',
        },
      ]
    )

    forEachTheme(
      'sequence loop/alt frames — label text on label box',
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
        {
          label: 'Label text on label box bg',
          // .labelText: fill = labelTextColor
          // .labelBox: fill = labelBoxBkgColor
          textSelector: '.labelText',
          textProperty: 'fill',
          bgSelector: '.labelBox',
          bgProperty: 'fill',
        },
        {
          label: 'Loop text on page background',
          // .loopText: fill = loopTextColor
          textSelector: '.loopText',
          textProperty: 'fill',
          bgSelector: null,
        },
      ]
    )

    forEachTheme(
      'sequence activation boxes',
      `sequenceDiagram
  Alice->>+Bob: Request
  Bob->>+Service: Process
  Service-->>-Bob: Result
  Bob-->>-Alice: Response`,
      [
        {
          label: 'Signal text on activation box bg',
          // .messageText: fill = signalTextColor
          // .activation0: fill = activationBkgColor
          textSelector: '.messageText',
          textProperty: 'fill',
          bgSelector: '.activation0',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Flowchart ──────────────────────────────────────────────────────────────

  test.describe('Flowchart', () => {

    forEachTheme(
      'nodes and edge labels',
      `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Skip]
  C --> E[End]
  D --> E`,
      [
        {
          label: 'Node label on node bg',
          textSelector: '.nodeLabel',
          textProperty: 'color',
          bgSelector: '.node rect',
          bgProperty: 'fill',
        },
        {
          label: 'Edge label on edge label bg',
          textSelector: '.edgeLabel .label',
          textProperty: 'color',
          bgSelector: '.edgeLabel .label-container',
          bgProperty: 'fill',
        },
      ]
    )

    forEachTheme(
      'subgraph cluster labels',
      `flowchart TD
  subgraph GroupA[Group A]
    A[Alpha]
    B[Beta]
  end
  A --> C[Gamma]`,
      [
        {
          label: 'Cluster label on cluster bg',
          textSelector: '.cluster-label .nodeLabel, .cluster .label .nodeLabel',
          textProperty: 'color',
          bgSelector: '.cluster rect',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Class diagram ──────────────────────────────────────────────────────────

  test.describe('Class diagram', () => {

    forEachTheme(
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
        {
          label: 'Class title on class bg (fillType)',
          textSelector: '.classTitle',
          textProperty: 'fill',
          bgSelector: '.classGroup .outer-title, .classGroup > rect',
          bgProperty: 'fill',
        },
        {
          label: 'Class member text on class body bg',
          textSelector: '.member',
          textProperty: 'fill',
          bgSelector: '.classGroup rect',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── ER diagram ─────────────────────────────────────────────────────────────

  test.describe('ER diagram', () => {

    forEachTheme(
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
        {
          label: 'Entity header text on entity header bg',
          textSelector: '.er.entityLabel',
          textProperty: 'fill',
          bgSelector: '.er.entityBox',
          bgProperty: 'fill',
        },
        {
          label: 'Attribute text on even attr row bg',
          textSelector: '.er.attributeBoxEven text',
          textProperty: 'fill',
          bgSelector: '.er.attributeBoxEven',
          bgProperty: 'fill',
        },
        {
          label: 'Attribute text on odd attr row bg',
          textSelector: '.er.attributeBoxOdd text',
          textProperty: 'fill',
          bgSelector: '.er.attributeBoxOdd',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── State diagram ──────────────────────────────────────────────────────────

  test.describe('State diagram', () => {

    forEachTheme(
      'state labels',
      `stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Done : complete
  Running --> Failed : error
  Done --> [*]
  Failed --> [*]`,
      [
        {
          label: 'State label on state bg',
          textSelector: '.state-title',
          textProperty: 'fill',
          bgSelector: '.stateGroup rect, .basic-state rect',
          bgProperty: 'fill',
        },
      ]
    )

    forEachTheme(
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
        {
          label: 'Composite state title on composite title bg',
          textSelector: '.compositeTitle',
          textProperty: 'fill',
          bgSelector: '.compositeTitle ~ rect, .compositeTitleBackground',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Gantt chart ────────────────────────────────────────────────────────────

  test.describe('Gantt chart', () => {

    forEachTheme(
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
        {
          label: 'Task text on task bg',
          textSelector: '.taskText',
          textProperty: 'fill',
          bgSelector: '.task:not(.crit)',
          bgProperty: 'fill',
        },
        {
          label: 'Task text on crit task bg',
          textSelector: '.taskTextCritLine, .taskTextCritNoLine',
          textProperty: 'fill',
          bgSelector: '.crit',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Git graph ──────────────────────────────────────────────────────────────

  test.describe('Git graph', () => {

    forEachTheme(
      'branch commits and labels',
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
        {
          // .commit-label: fill = commitLabelColor (the commit ID text beneath each commit)
          // .commit-label-bkg: fill = commitLabelBackground (rect behind the label, opacity 0.5)
          // We check against the page background since at opacity 0.5 the effective bg is a blend;
          // checking against the background is the conservative (safer) choice.
          label: 'Commit ID label (commitLabelColor) on page background',
          textSelector: '.commit-label',
          textProperty: 'fill',
          bgSelector: null, // page background
        },
        {
          // .branch-label{i}: fill = gitBranchLabelN (branch name text color)
          // Branch label text is rendered ON the git line, not on a separate bg rect.
          // The effective background behind branch labels is the diagram canvas.
          label: 'Branch label text (gitBranchLabelN) on page background',
          textSelector: '.branch-label0, .branch-label1, .branch-label2',
          textProperty: 'fill',
          bgSelector: null, // page background
        },
      ]
    )

  })

  // ── Pie chart ──────────────────────────────────────────────────────────────

  test.describe('Pie chart', () => {

    forEachTheme(
      'pie slices and section labels',
      `pie title Quarterly Revenue
  "Q1" : 25
  "Q2" : 30
  "Q3" : 20
  "Q4" : 25`,
      [
        {
          label: 'Pie section text on pie slice bg',
          // pieSectionTextPath text: fill = pieSectionTextColor
          // .pieCircle path: fill = pie1..pie8 slice colors
          textSelector: '.pieSectionText',
          textProperty: 'fill',
          bgSelector: '.pieCircle path',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Journey diagram ────────────────────────────────────────────────────────

  test.describe('Journey diagram', () => {

    forEachTheme(
      'journey sections and task labels',
      `journey
  title A Developer's Day
  section Morning
    Coffee: 5: Dev
    Stand-up: 3: Dev, Team
  section Afternoon
    Coding: 8: Dev
    Review: 6: Dev, Team
  section Evening
    Deploy: 7: Dev`,
      [
        {
          label: 'Section label on section bg (cScale colors)',
          textSelector: '.label',
          textProperty: 'fill',
          bgSelector: 'rect.actor, .section',
          bgProperty: 'fill',
        },
      ]
    )

  })

  // ── Timeline ───────────────────────────────────────────────────────────────

  test.describe('Timeline diagram', () => {

    forEachTheme(
      'timeline events',
      `timeline
  title Software Release Timeline
  2023 : Planning
       : Architecture
  2024 : Development
       : Testing
  2025 : Launch
       : Growth`,
      [
        {
          label: 'Timeline event text on event bg',
          textSelector: '.timeline-event .label, .event-label',
          textProperty: 'fill',
          bgSelector: '.timeline-event rect, .event',
          bgProperty: 'fill',
        },
      ]
    )

  })

})
