/**
 * Custom theme presets for Pretty Fish.
 * Each preset is a complete design system — colors, typography, curves, spacing.
 * Uses mermaid's 'base' theme with full themeVariables + DiagramConfig overrides.
 */

import type { DiagramConfig, FlowchartCurve, MermaidLook } from '../types'

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
  // monotone curves for smooth connectors, roomy spacing, muted pastels
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
      secondaryColor: '#fce7f3',
      tertiaryColor: '#d1fae5',
      secondaryBorderColor: '#f9a8d4',
      tertiaryBorderColor: '#6ee7b7',
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
      labelBoxBkgColor: '#fce7f3',
      labelBoxBorderColor: '#f9a8d4',
      labelTextColor: '#1e293b',
      loopTextColor: '#475569',
      activationBkgColor: '#bfdbfe',
      activationBorderColor: '#60a5fa',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── Amethyst ───────────────────────────────────────────────────────────────
  // Bold purple hierarchy. Poppins for modern weight, cardinal curves
  // for smooth organic connections, tight spacing for dense tree layouts
  amethyst: {
    label: 'Amethyst',
    description: 'Bold purple gradients',
    configOverrides: {
      look: 'classic',
      fontFamily: '"Poppins", sans-serif',
      fontSize: 14,
      flowchart: { curve: 'cardinal', nodeSpacing: 40, rankSpacing: 45, padding: 12 },
      sequence: { actorMargin: 45, messageMargin: 30, width: 140 },
    },
    themeVariables: {
      primaryColor: '#7c3aed',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#6d28d9',
      lineColor: '#8b5cf6',
      background: '#ffffff',
      mainBkg: '#7c3aed',
      nodeBorder: '#6d28d9',
      clusterBkg: '#f5f3ff',
      edgeLabelBackground: '#ffffff',
      titleColor: '#4c1d95',
      fontFamily: '"Poppins", sans-serif',
      secondaryColor: '#c4b5fd',
      tertiaryColor: '#ddd6fe',
      secondaryBorderColor: '#a78bfa',
      tertiaryBorderColor: '#c4b5fd',
      secondaryTextColor: '#2e1065',
      tertiaryTextColor: '#4c1d95',
      noteBkgColor: '#f5f3ff',
      noteTextColor: '#4c1d95',
      noteBorderColor: '#c4b5fd',
      actorBkg: '#7c3aed',
      actorBorder: '#6d28d9',
      actorTextColor: '#ffffff',
      signalColor: '#8b5cf6',
      signalTextColor: '#4c1d95',
      labelBoxBkgColor: '#ddd6fe',
      labelBoxBorderColor: '#a78bfa',
      labelTextColor: '#4c1d95',
      loopTextColor: '#6d28d9',
      activationBkgColor: '#ede9fe',
      activationBorderColor: '#8b5cf6',
      sequenceNumberColor: '#ffffff',
    },
  },

  // ── Neon ────────────────────────────────────────────────────────────────────
  // Neo-brutalist chaos. Space Mono for that retro-tech feel, step curves
  // for rigid grid-like connectors, big bold fontSize, tight padding
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
    },
    themeVariables: {
      primaryColor: '#3333ff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#0a0a0a',
      lineColor: '#0a0a0a',
      background: '#ffffff',
      mainBkg: '#3333ff',
      nodeBorder: '#0a0a0a',
      clusterBkg: '#d4ff00',
      edgeLabelBackground: '#d4ff00',
      titleColor: '#0a0a0a',
      fontFamily: '"Space Mono", monospace',
      secondaryColor: '#ff44cc',
      tertiaryColor: '#d4ff00',
      secondaryBorderColor: '#0a0a0a',
      tertiaryBorderColor: '#0a0a0a',
      secondaryTextColor: '#ffffff',
      tertiaryTextColor: '#0a0a0a',
      noteBkgColor: '#d4ff00',
      noteTextColor: '#0a0a0a',
      noteBorderColor: '#0a0a0a',
      actorBkg: '#3333ff',
      actorBorder: '#0a0a0a',
      actorTextColor: '#ffffff',
      signalColor: '#0a0a0a',
      signalTextColor: '#0a0a0a',
      labelBoxBkgColor: '#ff44cc',
      labelBoxBorderColor: '#0a0a0a',
      labelTextColor: '#ffffff',
      loopTextColor: '#0a0a0a',
      activationBkgColor: '#d4ff00',
      activationBorderColor: '#0a0a0a',
      sequenceNumberColor: '#ffffff',
    },
  },
}

export const CUSTOM_THEME_IDS = Object.keys(CUSTOM_THEME_PRESETS) as (keyof typeof CUSTOM_THEME_PRESETS)[]
