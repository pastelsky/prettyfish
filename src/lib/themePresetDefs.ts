import type { DiagramConfig, MermaidLook } from '../types'
import type { ThemeVariablesByDiagram } from './mermaidThemeVariables'

import wireframe from './themes/wireframe'
import corporate from './themes/corporate'
import amethyst from './themes/amethyst'
import neon from './themes/neon'
import newsprint from './themes/newsprint'
import dataviz from './themes/dataviz'
import evergreen from './themes/evergreen'
import rosepine from './themes/rosepine'
import bauhaus from './themes/bauhaus'
import blueprint from './themes/blueprint'
import terracotta from './themes/terracotta'
import midnight from './themes/midnight'
import ocean from './themes/ocean'
import brutalist from './themes/brutalist'

export interface ThemePresetDef {
  label: string
  description: string
  /** If true, this theme is hidden from the UI and cannot be selected. The definition is kept for backwards compatibility with saved documents. */
  disabled?: boolean
  vars: ThemeVariablesByDiagram
  /** Raw CSS injected into Mermaid's SVG for per-theme visual refinements (shadows, border-radius, stroke-width, etc.) */
  themeCSS?: string
  configOverrides: Partial<{
    look: MermaidLook
    fontFamily: string
    fontSize: number
    flowchart: Partial<DiagramConfig['flowchart']>
    sequence: Partial<DiagramConfig['sequence']>
    gantt: Partial<DiagramConfig['gantt']>
    xyChart: Partial<{ plotColorPalette: string }>
  }>
}

export const THEME_PRESET_DEFS: Record<string, ThemePresetDef> = {
  wireframe,
  corporate,
  amethyst,
  neon,
  newsprint,
  dataviz,
  evergreen,
  rosepine,
  bauhaus,
  blueprint,
  terracotta,
  midnight,
  ocean,
  brutalist,
}
