/**
 * Custom theme presets for Pretty Fish.
 * Each preset is a complete design system — colors, typography, curves, spacing.
 * Uses mermaid's 'base' theme with full themeVariables + DiagramConfig overrides.
 */

import type { DiagramConfig, MermaidLook } from '../types'

export interface ThemePreset {
  label: string
  description: string
  themeVariables: Record<string, string>
  /** Partial config overrides — merged on top of defaults when theme is selected */
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

export const CUSTOM_THEME_PRESETS: Record<string, ThemePreset> = {

  // ── Wireframe ──────────────────────────────────────────────────────────────
  // Hand-drawn UX wireframe feel. Sketch look, monospaced labels,
  // step curves for rigid flow connectors, wide spacing
  wireframe: {
    label: 'Wireframe',
    description: 'Sketch-style wireframe',
    configOverrides: {
      look: 'handDrawn',
      fontFamily: '"Caveat", cursive',
      fontSize: 18,
      flowchart: { curve: 'linear', nodeSpacing: 60, rankSpacing: 60, padding: 20 },
      sequence: { actorMargin: 60, messageMargin: 40 },
    },
    themeVariables: {
      primaryColor: '#f5f5f5',
      primaryTextColor: '#333333',
      primaryBorderColor: '#888888',
      lineColor: '#777777',
      background: '#ffffff',
      mainBkg: '#f5f5f5',
      nodeBorder: '#888888',
      clusterBkg: '#fafafa',
      edgeLabelBackground: '#ffffff',
      titleColor: '#333333',
      fontFamily: '"Caveat", cursive',
      secondaryColor: '#eeeeee',
      tertiaryColor: '#fafafa',
      secondaryBorderColor: '#aaaaaa',
      tertiaryBorderColor: '#cccccc',
      secondaryTextColor: '#555555',
      tertiaryTextColor: '#666666',
      noteBkgColor: '#fff9c4',
      noteTextColor: '#333333',
      noteBorderColor: '#e6d85e',
      actorBkg: '#f5f5f5',
      actorBorder: '#888888',
      actorTextColor: '#333333',
      signalColor: '#777777',
      signalTextColor: '#333333',
      labelBoxBkgColor: '#f5f5f5',
      labelBoxBorderColor: '#aaaaaa',
      labelTextColor: '#333333',
      loopTextColor: '#666666',
      activationBkgColor: '#eeeeee',
      activationBorderColor: '#999999',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── Corporate ──────────────────────────────────────────────────────────────
  // Polished business presentation. Source Sans 3 for professionalism,
  // monotone curves for smooth connectors, roomy spacing, muted blues
  corporate: {
    label: 'Corporate',
    description: 'Clean business pastels',
    configOverrides: {
      look: 'classic',
      fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
      fontSize: 15,
      flowchart: { curve: 'monotoneX', nodeSpacing: 55, rankSpacing: 55, padding: 18 },
      sequence: { actorMargin: 55, messageMargin: 38, width: 160 },
      gantt: { barHeight: 24, barGap: 6 },
      xyChart: { plotColorPalette: '#3b82f6,#0ea5e9,#06b6d4,#6366f1,#8b5cf6,#64748b' },
    },
    themeVariables: {
      primaryColor: '#dbeafe',
      primaryTextColor: '#1e293b',
      primaryBorderColor: '#93c5fd',
      lineColor: '#94a3b8',
      background: '#ffffff',
      mainBkg: '#dbeafe',
      nodeBorder: '#93c5fd',
      clusterBkg: '#f8fafc',
      edgeLabelBackground: '#ffffff',
      titleColor: '#0f172a',
      fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
      // Muted teal secondary instead of pink
      secondaryColor: '#ccfbf1',
      tertiaryColor: '#e0f2fe',
      secondaryBorderColor: '#5eead4',
      tertiaryBorderColor: '#7dd3fc',
      secondaryTextColor: '#1e293b',
      tertiaryTextColor: '#1e293b',
      noteBkgColor: '#fef9c3',
      noteTextColor: '#1e293b',
      noteBorderColor: '#fde047',
      actorBkg: '#dbeafe',
      actorBorder: '#93c5fd',
      actorTextColor: '#1e293b',
      signalColor: '#64748b',
      signalTextColor: '#1e293b',
      labelBoxBkgColor: '#ccfbf1',
      labelBoxBorderColor: '#5eead4',
      labelTextColor: '#1e293b',
      loopTextColor: '#475569',
      activationBkgColor: '#bfdbfe',
      activationBorderColor: '#60a5fa',
      sequenceNumberColor: '#ffffff',
      // Git graph — muted blues not magenta
      git0: '#3b82f6',
      git1: '#0ea5e9',
      git2: '#06b6d4',
      git3: '#6366f1',
      git4: '#8b5cf6',
      git5: '#64748b',
      git6: '#0284c7',
      git7: '#0369a1',
      gitBranchLabel0: '#ffffff',
      gitBranchLabel1: '#ffffff',
      gitBranchLabel2: '#ffffff',
      gitBranchLabel3: '#ffffff',
      gitBranchLabel4: '#ffffff',
      gitBranchLabel5: '#ffffff',
      gitBranchLabel6: '#ffffff',
      gitBranchLabel7: '#ffffff',
      // XY / gantt bars — explicit palette (string form for themeVariables)
      fillType0: '#dbeafe',
      fillType1: '#ccfbf1',
      fillType2: '#e0f2fe',
      fillType3: '#bfdbfe',
      fillType4: '#a5f3fc',
      fillType5: '#bae6fd',
      fillType6: '#dbeafe',
      fillType7: '#ccfbf1',
    },
  },

  // ── Amethyst ───────────────────────────────────────────────────────────────
  // Rich purple palette — dark fills get white text, light fills get dark text
  amethyst: {
    label: 'Amethyst',
    description: 'Rich purple palette',
    configOverrides: {
      look: 'classic',
      fontFamily: '"Poppins", sans-serif',
      fontSize: 14,
      flowchart: { curve: 'cardinal', nodeSpacing: 44, rankSpacing: 50, padding: 14 },
      sequence: { actorMargin: 45, messageMargin: 30, width: 140 },
      xyChart: { plotColorPalette: '#7c3aed,#a78bfa,#6d28d9,#c4b5fd,#5b21b6,#ddd6fe' },
    },
    themeVariables: {
      // Primary: light lavender fill with deep purple text — readable
      primaryColor: '#ede9fe',
      primaryTextColor: '#3b0764',
      primaryBorderColor: '#7c3aed',
      lineColor: '#7c3aed',
      background: '#ffffff',
      mainBkg: '#ede9fe',
      nodeBorder: '#7c3aed',
      clusterBkg: '#f5f3ff',
      edgeLabelBackground: '#faf5ff',
      titleColor: '#4c1d95',
      fontFamily: '"Poppins", sans-serif',
      // Secondary: medium purple fill, white text
      secondaryColor: '#7c3aed',
      secondaryBorderColor: '#6d28d9',
      secondaryTextColor: '#ffffff',
      // Tertiary: soft lilac
      tertiaryColor: '#ddd6fe',
      tertiaryBorderColor: '#a78bfa',
      tertiaryTextColor: '#3b0764',
      noteBkgColor: '#f5f3ff',
      noteTextColor: '#4c1d95',
      noteBorderColor: '#c4b5fd',
      actorBkg: '#7c3aed',
      actorBorder: '#6d28d9',
      actorTextColor: '#ffffff',
      signalColor: '#6d28d9',
      signalTextColor: '#4c1d95',
      labelBoxBkgColor: '#ede9fe',
      labelBoxBorderColor: '#a78bfa',
      labelTextColor: '#3b0764',
      loopTextColor: '#6d28d9',
      activationBkgColor: '#c4b5fd',
      activationBorderColor: '#7c3aed',
      sequenceNumberColor: '#ffffff',
      // Git graph — purple palette
      git0: '#7c3aed',
      git1: '#6d28d9',
      git2: '#a78bfa',
      git3: '#8b5cf6',
      git4: '#4c1d95',
      git5: '#c4b5fd',
      git6: '#5b21b6',
      git7: '#7c3aed',
      gitBranchLabel0: '#ffffff',
      gitBranchLabel1: '#ffffff',
      gitBranchLabel2: '#3b0764',
      gitBranchLabel3: '#ffffff',
      gitBranchLabel4: '#ffffff',
      gitBranchLabel5: '#3b0764',
      gitBranchLabel6: '#ffffff',
      gitBranchLabel7: '#ffffff',
      // Fills for timeline etc — light to medium purple so text stays legible
      fillType0: '#ede9fe',
      fillType1: '#ddd6fe',
      fillType2: '#c4b5fd',
      fillType3: '#a78bfa',
      fillType4: '#8b5cf6',
      fillType5: '#7c3aed',
      fillType6: '#6d28d9',
      fillType7: '#5b21b6',
    },
  },

  // ── Neon ────────────────────────────────────────────────────────────────────
  // Neo-brutalist. Bold electric colors, step curves, Space Mono, thick borders.
  // Toned down to be legible while still punchy.
  neon: {
    label: 'Neon',
    description: 'Electric brutalist colors',
    configOverrides: {
      look: 'classic',
      fontFamily: '"Space Mono", monospace',
      fontSize: 13,
      flowchart: { curve: 'step', nodeSpacing: 45, rankSpacing: 50, padding: 10 },
      sequence: { showSequenceNumbers: true, actorMargin: 40, messageMargin: 30, width: 130 },
      gantt: { barHeight: 28, barGap: 2 },
      xyChart: { plotColorPalette: '#2d2dff,#ff2d9b,#00cc44,#ff8800,#00cccc,#cc00ff,#ffcc00' },
    },
    themeVariables: {
      primaryColor: '#2d2dff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#000000',
      lineColor: '#111111',
      background: '#ffffff',
      mainBkg: '#2d2dff',
      nodeBorder: '#000000',
      clusterBkg: '#e8ff00',
      edgeLabelBackground: '#e8ff00',
      titleColor: '#000000',
      fontFamily: '"Space Mono", monospace',
      // Magenta secondary — but with black text for legibility
      secondaryColor: '#ff2d9b',
      tertiaryColor: '#e8ff00',
      secondaryBorderColor: '#000000',
      tertiaryBorderColor: '#000000',
      secondaryTextColor: '#ffffff',
      tertiaryTextColor: '#000000',
      noteBkgColor: '#e8ff00',
      noteTextColor: '#000000',
      noteBorderColor: '#000000',
      actorBkg: '#2d2dff',
      actorBorder: '#000000',
      actorTextColor: '#ffffff',
      signalColor: '#000000',
      signalTextColor: '#000000',
      labelBoxBkgColor: '#ff2d9b',
      labelBoxBorderColor: '#000000',
      labelTextColor: '#ffffff',
      loopTextColor: '#000000',
      activationBkgColor: '#e8ff00',
      activationBorderColor: '#000000',
      sequenceNumberColor: '#ffffff',
      // Git graph — electric palette
      git0: '#2d2dff',
      git1: '#ff2d9b',
      git2: '#00cc44',
      git3: '#ff8800',
      git4: '#00cccc',
      git5: '#cc00ff',
      git6: '#ffcc00',
      git7: '#2d2dff',
      gitBranchLabel0: '#ffffff',
      gitBranchLabel1: '#ffffff',
      gitBranchLabel2: '#000000',
      gitBranchLabel3: '#000000',
      gitBranchLabel4: '#000000',
      gitBranchLabel5: '#ffffff',
      gitBranchLabel6: '#000000',
      gitBranchLabel7: '#ffffff',
      // Gantt / fill types
      fillType0: '#2d2dff',
      fillType1: '#ff2d9b',
      fillType2: '#e8ff00',
      fillType3: '#00cc44',
      fillType4: '#ff8800',
      fillType5: '#00cccc',
      fillType6: '#cc00ff',
      fillType7: '#ffcc00',
    },
  },
  blueprint: {
    label: 'Blueprint',
    description: 'Technical blueprint with deep navy borders, monospace font, and minimal fills',
    configOverrides: {
      look: 'classic' as const,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      flowchart: { curve: 'linear' as const, nodeSpacing: 48, rankSpacing: 52, padding: 16, diagramPadding: 10 },
      sequence: { showSequenceNumbers: false, mirrorActors: false, messageMargin: 30, actorMargin: 50, width: 140 },
      gantt: { barHeight: 18, barGap: 4, topPadding: 48, axisFormat: '%Y-%m-%d' },
    },
    themeVariables: {
      // Deep blueprint blue — like technical drawing paper
      primaryColor: '#e8eef8',          // very light blue fill
      primaryTextColor: '#0a2d6b',      // deep navy text
      primaryBorderColor: '#0a2d6b',    // deep navy border
      lineColor: '#1a4a9a',             // medium-deep blue for edges
      background: '#f5f8ff',
      mainBkg: '#e8eef8',
      nodeBorder: '#0a2d6b',
      clusterBkg: '#eef2fc',
      edgeLabelBackground: '#f0f4ff',
      titleColor: '#0a2d6b',
      fontFamily: '"JetBrains Mono", monospace',
      // Secondary: deep cobalt
      secondaryColor: '#e8f0ff',
      secondaryBorderColor: '#1a3a8a',
      secondaryTextColor: '#1a3a8a',
      // Tertiary: deep slate blue
      tertiaryColor: '#edf1fb',
      tertiaryBorderColor: '#2a4a7a',
      tertiaryTextColor: '#2a4a7a',
      // Notes
      noteBkgColor: '#eef3ff',
      noteTextColor: '#0a2d6b',
      noteBorderColor: '#1a4a9a',
      // Sequence actors
      actorBkg: '#e8eef8',
      actorBorder: '#0a2d6b',
      actorTextColor: '#0a2d6b',
      signalColor: '#0a2d6b',
      signalTextColor: '#0a2d6b',
      labelBoxBkgColor: '#e8eef8',
      labelBoxBorderColor: '#0a2d6b',
      labelTextColor: '#0a2d6b',
      loopTextColor: '#0a2d6b',
      activationBkgColor: '#c8d8f0',
      activationBorderColor: '#0a2d6b',
      sequenceNumberColor: '#ffffff',
    },
  },
}

export const CUSTOM_THEME_IDS = Object.keys(CUSTOM_THEME_PRESETS) as (keyof typeof CUSTOM_THEME_PRESETS)[]
