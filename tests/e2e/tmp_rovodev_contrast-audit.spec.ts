/**
 * N×N Playwright contrast audit — renders every template in every theme,
 * extracts text/background color pairs from the actual SVG DOM, and reports
 * WCAG contrast failures.
 *
 * Runs with fullyParallel workers for speed.
 */
import { test } from '@playwright/test'
import { createApp } from './pretty-fish-app'

test.describe.configure({ mode: 'parallel' })

// ── WCAG helpers ──

function parseColor(raw: string): [number, number, number] | null {
  let m = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
  m = raw.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  m = raw.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/)
  if (m) {
    const [h, s, l] = [+m[1], +m[2] / 100, +m[3] / 100]
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
  }
  if (raw === 'white' || raw === '#fff') return [255, 255, 255]
  if (raw === 'black' || raw === '#000') return [0, 0, 0]
  return null
}

function luminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrast(c1: [number, number, number], c2: [number, number, number]) {
  const l1 = luminance(...c1), l2 = luminance(...c2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// ── Templates and themes ──

const TEMPLATES = [
  'flowchart', 'sequence', 'classDiagram', 'erDiagram', 'stateDiagram',
  'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline', 'quadrantChart',
  'xychart', 'architecture', 'kanban', 'sankey', 'block', 'packet',
  'journey', 'requirement', 'radar',
]

const TEMPLATE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart', sequence: 'Sequence', classDiagram: 'Class Diagram',
  erDiagram: 'ER Diagram', stateDiagram: 'State Diagram', gantt: 'Gantt Chart',
  pie: 'Pie Chart', gitgraph: 'Git Graph', mindmap: 'Mindmap',
  timeline: 'Timeline', quadrantChart: 'Quadrant', xychart: 'XY Chart',
  architecture: 'Architecture', kanban: 'Kanban', sankey: 'Sankey',
  block: 'Block Diagram', packet: 'Packet', journey: 'Journey',
  requirement: 'Requirement', radar: 'Radar',
}

const THEMES = [
  'default', 'neutral', 'dark', 'forest', 'base',
  'wireframe', 'corporate', 'amethyst', 'neon', 'blueprint',
]

// ── Extract color pairs from rendered SVG ──

async function extractColorPairs(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svgs = document.querySelectorAll('svg[aria-roledescription], svg.flowchart, svg.erDiagram, svg.mindmap')
    let svg: Element | null = null
    for (const s of svgs) {
      if (s.querySelector('g')) { svg = s; break }
    }
    // Fallback: find any SVG inside diagram node
    if (!svg) svg = document.querySelector('[data-testid="diagram-node"] svg')
    if (!svg) return []

    // Get root fill from style
    const styleText = svg.querySelector('style')?.textContent || ''
    const rootFillMatch = styleText.match(/fill:\s*([^;}\s]+)/)
    const rootFill = rootFillMatch?.[1] || '#000000'

    const pairs: { text: string; bg: string; el: string }[] = []
    const seen = new Set<string>()

    // 1) Path fills vs root text color
    for (const p of svg.querySelectorAll('path[fill]')) {
      const fill = p.getAttribute('fill')
      if (!fill || fill === 'none' || fill === 'transparent') continue
      const key = `${rootFill}|${fill}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ text: rootFill, bg: fill, el: `path` })
    }

    // 2) Rect fills vs root text color
    for (const r of svg.querySelectorAll('rect[fill]')) {
      const fill = r.getAttribute('fill')
      if (!fill || fill === 'none' || fill === 'transparent') continue
      const key = `${rootFill}|${fill}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ text: rootFill, bg: fill, el: `rect` })
    }

    // 3) Circle fills vs root text color
    for (const c of svg.querySelectorAll('circle[fill]')) {
      const fill = c.getAttribute('fill')
      if (!fill || fill === 'none' || fill === 'transparent') continue
      const key = `${rootFill}|${fill}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ text: rootFill, bg: fill, el: `circle` })
    }

    // 4) Text elements with computed styles
    for (const textEl of Array.from(svg.querySelectorAll('text, foreignObject span, foreignObject p, foreignObject div')).slice(0, 40)) {
      const cs = window.getComputedStyle(textEl as HTMLElement)
      const textColor = cs.color
      if (!textColor || textColor === 'rgba(0, 0, 0, 0)') continue

      let bgColor = ''
      let parent: Element | null = (textEl as HTMLElement).parentElement
      while (parent && parent !== svg) {
        const fill = parent.getAttribute('fill')
        if (fill && fill !== 'none' && fill !== 'inherit') { bgColor = fill; break }
        const pcs = window.getComputedStyle(parent as HTMLElement)
        if (pcs.backgroundColor && pcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && pcs.backgroundColor !== 'transparent') {
          bgColor = pcs.backgroundColor; break
        }
        parent = parent.parentElement
      }
      if (!bgColor) continue
      const key = `${textColor}|${bgColor}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ text: textColor, bg: bgColor, el: textEl.tagName })
    }

    return pairs
  })
}

// ── Generate tests ──

for (const theme of THEMES) {
  for (const template of TEMPLATES) {
    const label = TEMPLATE_LABELS[template] || template

    test(`${theme} × ${label}`, async ({ page }) => {
      test.setTimeout(30_000)

      const app = createApp(page)
      await app.openFresh()

      // Select theme
      await app.header.chooseTheme(theme)
      await page.waitForTimeout(300)

      // Double-click diagram to open sidebar
      const diagramNode = page.getByTestId('diagram-node').first()
      await diagramNode.dblclick()
      await page.waitForTimeout(300)

      // Find and click template
      const templateCard = page.getByTestId('template-card').filter({ hasText: label })
      if (await templateCard.count() === 0) {
        // Template not found, skip
        return
      }
      await templateCard.first().scrollIntoViewIfNeeded()
      await templateCard.first().click()
      await page.waitForTimeout(2500)

      // Extract color pairs
      const pairs = await extractColorPairs(page)

      // Compute contrast
      const failures: string[] = []
      for (const pair of pairs) {
        const tc = parseColor(pair.text)
        const bc = parseColor(pair.bg)
        if (!tc || !bc) continue
        const ratio = contrast(tc, bc)
        if (ratio < 3.0) {
          failures.push(`  ❌ ${Math.round(ratio * 100) / 100}:1  text=${pair.text}  bg=${pair.bg}  (${pair.el})`)
        } else if (ratio < 4.5) {
          failures.push(`  ⚠️  ${Math.round(ratio * 100) / 100}:1  text=${pair.text}  bg=${pair.bg}  (${pair.el})`)
        }
      }

      if (failures.length > 0) {
        console.log(`\n── ${theme} × ${label} ──`)
        for (const f of failures) console.log(f)
      }
    })
  }
}
