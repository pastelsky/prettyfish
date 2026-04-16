export type AppMode = 'light' | 'dark'
export type MermaidBuiltinTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base'
export type MermaidTheme = MermaidBuiltinTheme | 'wireframe' | 'corporate' | 'amethyst' | 'neon' | 'blueprint' | 'newsprint' | 'dataviz' | 'evergreen' | 'rosepine' | 'bauhaus' | 'terracotta' | 'midnight' | 'ocean' | 'brutalist'

export type DiagramConfigOverrides = {
  [K in keyof DiagramConfig]?: DiagramConfig[K] extends object ? Partial<DiagramConfig[K]> : DiagramConfig[K]
}

export interface MermaidRenderError {
  message: string
  line: number | null
  column: number | null
}

export type DiagramRenderStatus = 'queued' | 'rendering' | 'ready' | 'error'

export interface DiagramRenderState {
  status: DiagramRenderStatus
  svg: string
  error: MermaidRenderError | null
  /** Intrinsic rendered SVG width before CSS scaling */
  svgWidth: number | null
  /** Intrinsic rendered SVG height before CSS scaling */
  svgHeight: number | null
  /** Hash/signature of the latest requested input */
  inputHash: string | null
  /** Hash/signature that produced the current svg/error */
  outputHash: string | null
}

// ── Diagram ──────────────────────────────────────────────────────────────────
// Each diagram lives on an infinite canvas and contains one Mermaid diagram.

export interface Diagram {
  id: string
  name: string
  description?: string
  code: string
  /** Canvas position (React Flow coordinates) */
  x: number
  y: number
  /** Diagram width in pixels */
  width: number
  mermaidTheme?: MermaidTheme
  configOverrides?: DiagramConfigOverrides
  /** Runtime-only derived render state. Intentionally omitted from persisted/share state. */
  render?: DiagramRenderState
}

// ── Page ──────────────────────────────────────────────────────────────────────
// A page is a named infinite canvas that contains multiple diagrams.

export interface DiagramPage {
  id: string
  name: string
  diagrams: Diagram[]
  activeDiagramId: string | null
}

// ── App state ─────────────────────────────────────────────────────────────────

/** Serializable application state — can be saved to / loaded from a JSON file. */
export interface AppState {
  /** Format version for future migrations */
  version: 1
  pages: DiagramPage[]
  activePageId: string
  mode: AppMode
  editorLigatures: boolean
  autoFormat: boolean
}

export const MERMAID_THEMES: { value: MermaidTheme; label: string; group: 'builtin' | 'custom' }[] = [
  { value: 'default', label: 'Default', group: 'builtin' },
  { value: 'neutral', label: 'Neutral', group: 'builtin' },
  { value: 'dark', label: 'Dark', group: 'builtin' },
  { value: 'forest', label: 'Forest', group: 'builtin' },
  { value: 'base', label: 'Base', group: 'builtin' },
  { value: 'wireframe', label: 'Wireframe', group: 'custom' },
  { value: 'corporate', label: 'Corporate', group: 'custom' },
  { value: 'blueprint', label: 'Blueprint', group: 'custom' },
  { value: 'newsprint', label: 'Newsprint', group: 'custom' },
  { value: 'rosepine', label: 'Rosé Pine', group: 'custom' },
  { value: 'brutalist', label: 'Brutalist', group: 'custom' },
  // The following themes are disabled and hidden from the UI.
  // They remain in MERMAID_THEMES only for rendering backwards-compatible saved documents.
  // { value: 'amethyst', label: 'Amethyst', group: 'custom' },
  // { value: 'neon', label: 'Neon', group: 'custom' },
  // { value: 'dataviz', label: 'DataViz', group: 'custom' },
  // { value: 'evergreen', label: 'Evergreen', group: 'custom' },
  // { value: 'bauhaus', label: 'Bauhaus', group: 'custom' },
  // { value: 'terracotta', label: 'Terracotta', group: 'custom' },
  // { value: 'midnight', label: 'Midnight', group: 'custom' },
  // { value: 'ocean', label: 'Ocean', group: 'custom' },
]

export const BUILTIN_THEMES = new Set<string>(['default', 'neutral', 'dark', 'forest', 'base'])

export const DEFAULT_DIAGRAM = `flowchart TD
    A[Start] --> B[Read input]
    B --> C{Valid?}
    C -->|Yes| D[Process]
    C -->|No| E[Show error]
    E --> B
    D --> F[Done]`

// Grid layout constants for diagram placement
export const ARTBOARD_COLS = 3
export const ARTBOARD_GAP_X = 80
export const ARTBOARD_GAP_Y = 50
export const ARTBOARD_DEFAULT_WIDTH = 640
export const ARTBOARD_DEFAULT_HEIGHT = 480 // approximate, actual height is dynamic

export function nextDiagramPosition(diagrams: Diagram[]): { x: number; y: number } {
  if (diagrams.length === 0) return { x: 0, y: 0 }

  const col = diagrams.length % ARTBOARD_COLS
  const row = Math.floor(diagrams.length / ARTBOARD_COLS)

  // X: sum widths of diagrams in the same row up to this column
  const rowStart = row * ARTBOARD_COLS
  let x = 0
  for (let i = rowStart; i < rowStart + col; i++) {
    x += (diagrams[i]?.width ?? ARTBOARD_DEFAULT_WIDTH) + ARTBOARD_GAP_X
  }

  // Y: sum approximate heights of all rows above this one
  // Use the tallest diagram in each row as the row height
  let y = 0
  for (let r = 0; r < row; r++) {
    const rowDiagrams = diagrams.slice(r * ARTBOARD_COLS, (r + 1) * ARTBOARD_COLS)
    const rowHeight = Math.max(...rowDiagrams.map(d => d.render?.svgHeight ?? ARTBOARD_DEFAULT_HEIGHT))
    y += rowHeight + ARTBOARD_GAP_Y
  }

  return { x, y }
}

export function createDiagram(
  name: string,
  code: string = DEFAULT_DIAGRAM,
  position?: { x: number; y: number },
  mermaidTheme: MermaidTheme = 'blueprint',
): Diagram {
  return {
    id: crypto.randomUUID(),
    name,
    code,
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    width: ARTBOARD_DEFAULT_WIDTH,
    mermaidTheme,
    configOverrides: {},
  }
}

export function createPage(name: string, code?: string): DiagramPage {
  const diagram = createDiagram('Diagram 1', code ?? '', { x: 0, y: 0 })
  return {
    id: crypto.randomUUID(),
    name,
    diagrams: [diagram],
    activeDiagramId: diagram.id,
  }
}

export function createEmptyRenderState(): DiagramRenderState {
  return {
    status: 'queued',
    svg: '',
    error: null,
    svgWidth: null,
    svgHeight: null,
    inputHash: null,
    outputHash: null,
  }
}

export function withRuntimeDiagramState(diagram: Diagram): Diagram {
  return {
    ...diagram,
    render: diagram.render ?? createEmptyRenderState(),
  }
}

export function withRuntimePageState(page: DiagramPage): DiagramPage {
  return {
    ...page,
    diagrams: page.diagrams.map(withRuntimeDiagramState),
  }
}

export function withRuntimePagesState(pages: DiagramPage[]): DiagramPage[] {
  return pages.map(withRuntimePageState)
}

export function stripRuntimeDiagramState(diagram: Diagram): Diagram {
  const serializable = { ...diagram }
  delete serializable.render
  return serializable
}

export function stripRuntimePageState(page: DiagramPage): DiagramPage {
  return {
    ...page,
    diagrams: page.diagrams.map(stripRuntimeDiagramState),
  }
}

export function stripRuntimePagesState(pages: DiagramPage[]): DiagramPage[] {
  return pages.map(stripRuntimePageState)
}

export function deepMergeConfig(base: DiagramConfig, overrides: DiagramConfigOverrides): DiagramConfig {
  const result = { ...base }
  for (const key of Object.keys(overrides) as (keyof DiagramConfig)[]) {
    const val = overrides[key]
    if (val === undefined) continue
    if (typeof val === 'object' && val !== null && typeof base[key] === 'object') {
      (result as Record<string, unknown>)[key] = { ...base[key] as object, ...val }
    } else {
      (result as Record<string, unknown>)[key] = val
    }
  }
  return result
}

export function resolveConfig(
  presetConfigOverrides: DiagramConfigOverrides | undefined,
  userOverrides: DiagramConfigOverrides = {},
  legacyConfig?: DiagramConfig,
): DiagramConfig {
  if (legacyConfig && Object.keys(userOverrides).length === 0) {
    return legacyConfig
  }
  let config = { ...DEFAULT_DIAGRAM_CONFIG }
  if (presetConfigOverrides) config = deepMergeConfig(config, presetConfigOverrides)
  config = deepMergeConfig(config, userOverrides)
  return config
}

export type FlowchartCurve = 'basis' | 'bumpX' | 'bumpY' | 'cardinal' | 'catmullRom' | 'linear' | 'monotoneX' | 'monotoneY' | 'natural' | 'step' | 'stepAfter' | 'stepBefore'
export type FlowchartDirection = 'TB' | 'BT' | 'LR' | 'RL'
export type MermaidLook = 'classic' | 'handDrawn'

export interface DiagramConfig {
  look: MermaidLook
  fontFamily: string
  fontSize: number

  themeVariables: {
    primaryColor: string
    primaryTextColor: string
    primaryBorderColor: string
    lineColor: string
    background: string
    mainBkg: string
    nodeBorder: string
    clusterBkg: string
    edgeLabelBackground: string
    titleColor: string
    fontFamily: string
  }

  flowchart: {
    curve: FlowchartCurve
    nodeSpacing: number
    rankSpacing: number
    padding: number
    diagramPadding: number
  }

  sequence: {
    showSequenceNumbers: boolean
    mirrorActors: boolean
    messageMargin: number
    actorMargin: number
    width: number
    actorFontFamily?: string
    actorFontSize?: number
    actorFontWeight?: string | number
    noteFontFamily?: string
    noteFontSize?: number
    noteFontWeight?: string | number
    messageFontFamily?: string
    messageFontSize?: number
    messageFontWeight?: string | number
  }

  gantt: {
    barHeight: number
    barGap: number
    topPadding: number
    axisFormat: string
  }

  xyChart: {
    plotColorPalette: string
  }
}

export const DEFAULT_DIAGRAM_CONFIG: DiagramConfig = {
  look: 'classic',
  fontFamily: '"DM Sans", system-ui, sans-serif',
  fontSize: 16,
  themeVariables: {
    primaryColor: '#4f46e5',
    primaryTextColor: '#fff',
    primaryBorderColor: '#4338ca',
    lineColor: '#6b7280',
    background: '#ffffff',
    mainBkg: '#4f46e5',
    nodeBorder: '#4338ca',
    clusterBkg: '#ede9fe',
    edgeLabelBackground: '#f3f4f6',
    titleColor: '#111827',
    fontFamily: '"DM Sans", system-ui, sans-serif',
  },
  flowchart: {
    curve: 'basis',
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15,
    diagramPadding: 8,
  },
  sequence: {
    showSequenceNumbers: false,
    mirrorActors: false,
    messageMargin: 35,
    actorMargin: 50,
    width: 150,
  },
  gantt: {
    barHeight: 20,
    barGap: 4,
    topPadding: 50,
    axisFormat: '%Y-%m-%d',
  },
  xyChart: {
    plotColorPalette: '#3498db,#e74c3c,#2ecc71,#f39c12,#9b59b6,#1abc9c,#e67e22',
  },
}
