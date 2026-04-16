import type {
  Diagram,
  DiagramConfig,
  DiagramConfigOverrides,
  MermaidRenderError,
  MermaidTheme,
} from '../types'
import { BUILTIN_THEMES, resolveConfig } from '../types'
import { CUSTOM_THEME_PRESETS } from './themePresets'

type MermaidModule = typeof import('mermaid')
type MermaidApi = MermaidModule['default']

let mermaidPromise: Promise<MermaidApi> | null = null

async function getMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then((module) => module.default)
  return mermaidPromise
}

// Using crypto.randomUUID avoids a mutable module-level counter that leaks across test runs
function newRenderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `mermaid-render-${crypto.randomUUID()}`
  }
  return `mermaid-render-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface MermaidRenderResult {
  svg: string
  error: MermaidRenderError | null
  svgWidth: number | null
  svgHeight: number | null
}

export function getDiagramRenderHash(diagram: Diagram): string {
  return JSON.stringify({
    code: diagram.code,
    theme: diagram.mermaidTheme ?? 'default',
    configOverrides: diagram.configOverrides ?? {},
  })
}

export function resolveDiagramRenderInputs(diagram: Diagram): {
  theme: MermaidTheme
  diagramConfig: DiagramConfig
} {
  const theme: MermaidTheme = diagram.mermaidTheme ?? 'default'
  const diagramConfig = resolveConfig(
    CUSTOM_THEME_PRESETS[theme]?.configOverrides as DiagramConfigOverrides | undefined,
    diagram.configOverrides,
  )
  return { theme, diagramConfig }
}

function parseError(err: unknown): MermaidRenderError {
  const raw = err instanceof Error ? err.message : String(err)

  let line: number | null = null
  let column: number | null = null

  const lineMatch = raw.match(/(?:on |at )line\s+(\d+)/i)
  if (lineMatch) line = parseInt(lineMatch[1], 10)

  const lineColMatch = raw.match(/line\s+(\d+)(?::|\s*column\s*)(\d+)/i)
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10)
    column = parseInt(lineColMatch[2], 10)
  }

  const altLineMatch = raw.match(/line:\s*(\d+)/i)
  if (!line && altLineMatch) line = parseInt(altLineMatch[1], 10)
  if (!line && /unknown diagram/i.test(raw)) line = 1

  let message = raw
    .replace(/^Error:\s+/i, '')
    .replace(/\nSyntax error in text[\s\S]*/i, '')
    .replace(/^Syntax error in text[\s\S]*/i, 'Syntax error')
    .replace(/💣\s*/g, '')
    .replace(/\n\.{3}.*\n[-^]+\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!message || message.length < 3) {
    message = 'Syntax error — check your diagram code'
  }

  return { message, line, column }
}

function extractSvgDimensions(svg: string): { svgWidth: number | null; svgHeight: number | null } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'image/svg+xml')
  const svgElement = doc.querySelector('svg')
  if (!svgElement) return { svgWidth: null, svgHeight: null }

  const parseLength = (value: string | null): number | null => {
    if (!value) return null
    const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)/)
    return match ? Number(match[1]) : null
  }

  const width = parseLength(svgElement.getAttribute('width'))
  const height = parseLength(svgElement.getAttribute('height'))
  const viewBox = svgElement.getAttribute('viewBox')
  if (width && height) return { svgWidth: width, svgHeight: height }
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/).map(Number)
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return { svgWidth: parts[2], svgHeight: parts[3] }
    }
  }
  return { svgWidth: width, svgHeight: height }
}

export async function renderDiagram(diagram: Diagram): Promise<MermaidRenderResult> {
  const trimmed = diagram.code.trim()
  if (!trimmed) {
    return { svg: '', error: null, svgWidth: null, svgHeight: null }
  }

  const mermaid = await getMermaid()
  const { theme, diagramConfig } = resolveDiagramRenderInputs(diagram)
  const fontSizeStr = `${diagramConfig.fontSize}px`
  const isCustom = !BUILTIN_THEMES.has(theme)
  const customPreset = isCustom ? CUSTOM_THEME_PRESETS[theme] : null
  const effectiveTheme = isCustom ? 'base' : theme

  mermaid.initialize({
    startOnLoad: false,
    theme: effectiveTheme as Parameters<typeof mermaid.initialize>[0]['theme'],
    securityLevel: 'loose',
    look: diagramConfig.look,
    fontFamily: diagramConfig.fontFamily,
    fontSize: diagramConfig.fontSize,
    themeVariables: customPreset
      ? { ...customPreset.themeVariables, fontSize: fontSizeStr }
      : effectiveTheme === 'base'
        ? { ...diagramConfig.themeVariables, fontFamily: diagramConfig.fontFamily, fontSize: fontSizeStr }
        : { fontFamily: diagramConfig.fontFamily, fontSize: fontSizeStr },
    themeCSS: customPreset?.themeCSS ?? '',
    flowchart: diagramConfig.flowchart,
    sequence: diagramConfig.sequence,
    gantt: diagramConfig.gantt,
  })

  try {
    const id = newRenderId()
    let { svg } = await mermaid.render(id, trimmed)

    // Fix ER diagram alternating row backgrounds:
    // Mermaid computes lighten(background, N) for attribute rows, which
    // produces white-on-white when background is '#ffffff'. Replace with
    // the theme's explicit ER attribute colors if provided.
    if (customPreset && svg.includes('erDiagram')) {
      const vars = customPreset.themeVariables
      const odd = vars.attributeBackgroundColorOdd
      const even = vars.attributeBackgroundColorEven
      if (odd && even) {
        // The "lightened" white rows are hsl(H, S%, 100%) — replace them
        let isOdd = true
        svg = svg.replace(/fill="hsl\([^)]*,\s*100%\)"/g, () => {
          const color = isOdd ? odd : even
          isOdd = !isOdd
          return `fill="${color}"`
        })
      }
    }

    const dimensions = extractSvgDimensions(svg)
    return { svg, error: null, ...dimensions }
  } catch (err) {
    return { svg: '', error: parseError(err), svgWidth: null, svgHeight: null }
  } finally {
    document.querySelectorAll('body > [id^="mermaid-render-"]').forEach((el) => el.remove())
    document.querySelectorAll('body > .mermaid-error, body > pre').forEach(el => {
      if (el.textContent?.includes('mermaid') || el.textContent?.includes('💣')) el.remove()
    })
  }
}
