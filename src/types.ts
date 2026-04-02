export type AppMode = 'light' | 'dark'
export type MermaidBuiltinTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base'
export type MermaidTheme = MermaidBuiltinTheme | 'wireframe' | 'corporate' | 'amethyst' | 'neon' | 'blueprint'

/** Deep partial of DiagramConfig — only user-overridden fields */
export type DiagramConfigOverrides = {
  [K in keyof DiagramConfig]?: DiagramConfig[K] extends object ? Partial<DiagramConfig[K]> : DiagramConfig[K]
}

export interface DiagramFolder {
  id: string
  name: string
  collapsed: boolean
}

export interface DiagramPage {
  id: string
  name: string
  code: string
  mermaidTheme?: MermaidTheme
  /** Only stores user-overridden config fields; rest comes from theme preset + defaults */
  configOverrides?: DiagramConfigOverrides
  /** @deprecated — use configOverrides instead. Kept for backward compat with old saved state */
  diagramConfig?: DiagramConfig
  /** Optional folder ID — if set, page belongs to this folder */
  folderId?: string
}

export interface AppState {
  pages: DiagramPage[]
  folders: DiagramFolder[]
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
  { value: 'blueprint', label: 'Blueprint', group: 'custom' },
]

export const BUILTIN_THEMES = new Set<string>(['default', 'neutral', 'dark', 'forest', 'base'])

export const DEFAULT_DIAGRAM = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A`

export function createPage(name: string, code: string = DEFAULT_DIAGRAM): DiagramPage {
  return { id: crypto.randomUUID(), name, code, mermaidTheme: 'default', configOverrides: {} }
}

export function createFolder(name: string): DiagramFolder {
  return { id: crypto.randomUUID(), name, collapsed: false }
}

/** Deep merge: base ← overrides. Only copies defined override keys. */
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

/** Resolve the effective config: defaults → theme preset config overrides → user overrides.
 *  presetConfigOverrides comes from CUSTOM_THEME_PRESETS[theme].configOverrides */
export function resolveConfig(
  presetConfigOverrides: DiagramConfigOverrides | undefined,
  userOverrides: DiagramConfigOverrides = {},
  legacyConfig?: DiagramConfig,
): DiagramConfig {
  // If page has a legacy full diagramConfig (old format), use it directly
  if (legacyConfig && Object.keys(userOverrides).length === 0) {
    return legacyConfig
  }

  // Start with defaults
  let config = { ...DEFAULT_DIAGRAM_CONFIG }

  // Apply theme preset config overrides
  if (presetConfigOverrides) {
    config = deepMergeConfig(config, presetConfigOverrides)
  }

  // Apply user overrides on top
  config = deepMergeConfig(config, userOverrides)

  return config
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
