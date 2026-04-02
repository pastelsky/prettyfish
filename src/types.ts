export type AppMode = 'light' | 'dark'
export type MermaidBuiltinTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base'
export type MermaidTheme = MermaidBuiltinTheme | 'wireframe' | 'corporate' | 'amethyst' | 'neon'

export interface DiagramPage {
  id: string
  name: string
  code: string
  mermaidTheme?: MermaidTheme
  diagramConfig?: DiagramConfig
}

export interface AppState {
  pages: DiagramPage[]
  activePageId: string
  mode: AppMode
  mermaidTheme: MermaidTheme
  diagramConfig: DiagramConfig
  editorLigatures: boolean
}

export const MERMAID_THEMES: { value: MermaidTheme; label: string; group: 'builtin' | 'custom' }[] = [
  { value: 'default', label: 'Default', group: 'builtin' },
  { value: 'neutral', label: 'Neutral', group: 'builtin' },
  { value: 'dark', label: 'Dark', group: 'builtin' },
  { value: 'forest', label: 'Forest', group: 'builtin' },
  { value: 'base', label: 'Base', group: 'builtin' },
  { value: 'wireframe', label: 'Wireframe', group: 'custom' },
  { value: 'corporate', label: 'Corporate', group: 'custom' },
  { value: 'amethyst', label: 'Amethyst', group: 'custom' },
  { value: 'neon', label: 'Neon', group: 'custom' },
]

export const BUILTIN_THEMES = new Set<string>(['default', 'neutral', 'dark', 'forest', 'base'])

export const DEFAULT_DIAGRAM = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A`

export function createPage(name: string, code: string = DEFAULT_DIAGRAM, mermaidTheme: MermaidTheme = 'default', diagramConfig: DiagramConfig = DEFAULT_DIAGRAM_CONFIG): DiagramPage {
  return { id: crypto.randomUUID(), name, code, mermaidTheme, diagramConfig }
}

// ─── Mermaid diagram config ───────────────────────────────────────────────────

export type FlowchartCurve = 'basis' | 'bumpX' | 'bumpY' | 'cardinal' | 'catmullRom' | 'linear' | 'monotoneX' | 'monotoneY' | 'natural' | 'step' | 'stepAfter' | 'stepBefore'
export type FlowchartDirection = 'TB' | 'BT' | 'LR' | 'RL'
export type MermaidLook = 'classic' | 'handDrawn'

export interface DiagramConfig {
  // Global appearance
  look: MermaidLook
  fontFamily: string
  fontSize: number

  // Theme variables (universal)
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

  // Flowchart
  flowchart: {
    curve: FlowchartCurve
    nodeSpacing: number
    rankSpacing: number
    padding: number
    diagramPadding: number
  }

  // Sequence
  sequence: {
    showSequenceNumbers: boolean
    mirrorActors: boolean
    messageMargin: number
    actorMargin: number
    width: number
  }

  // Gantt
  gantt: {
    barHeight: number
    barGap: number
    topPadding: number
    axisFormat: string
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
}
