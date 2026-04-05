import { describe, expect, it } from 'vitest'

import { appStoreReducer, createStoreState } from '../appStore'
import { createDiagram, createPage, DEFAULT_DIAGRAM_CONFIG, resolveConfig, withRuntimePagesState } from '../../types'
import type { DiagramConfig, MermaidTheme } from '../../types'
import { CUSTOM_THEME_PRESETS } from '../../lib/themePresets'

function buildState(theme: MermaidTheme = 'default') {
  const diagram = createDiagram('Diagram 1', 'flowchart LR\n  A --> B', { x: 0, y: 0 })
  diagram.mermaidTheme = theme
  const page = createPage('Page 1')
  page.diagrams = [diagram]
  page.activeDiagramId = diagram.id

  return {
    state: createStoreState(
      {
        pages: withRuntimePagesState([page]),
        activePageId: page.id,
        mode: 'light',
        editorLigatures: true,
        autoFormat: true,
      },
      {
        sidebarOpen: true,
        docsOpen: false,
        helpOpen: false,
        contextMenu: null,
        sidebarWidth: null,
      },
    ),
    pageId: page.id,
    diagramId: diagram.id,
  }
}

function effectiveConfigFromState(state: ReturnType<typeof createStoreState>, diagramId: string): DiagramConfig {
  const page = state.pages.find((p) => p.id === state.activePageId)!
  const diagram = page.diagrams.find((d) => d.id === diagramId)!
  return resolveConfig(
    CUSTOM_THEME_PRESETS[diagram.mermaidTheme ?? 'default']?.configOverrides,
    diagram.configOverrides,
  )
}

describe('theme/config interplay', () => {
  it('lets a custom config change win over the selected theme preset', () => {
    const { state, diagramId } = buildState('corporate')

    const customConfig: DiagramConfig = {
      ...DEFAULT_DIAGRAM_CONFIG,
      ...effectiveConfigFromState(state, diagramId),
      fontSize: 22,
      flowchart: {
        ...effectiveConfigFromState(state, diagramId).flowchart,
        nodeSpacing: 110,
      },
    }

    const next = appStoreReducer(state, {
      type: 'diagram/update-config',
      diagramId,
      config: customConfig,
    })

    const resolved = effectiveConfigFromState(next, diagramId)
    expect(resolved.fontSize).toBe(22)
    expect(resolved.flowchart.nodeSpacing).toBe(110)
    expect(resolved.fontFamily).toBe(customConfig.fontFamily)
  })

  it('keeps existing user overrides when switching from one theme preset to another', () => {
    const { state, diagramId } = buildState('corporate')

    const configured = appStoreReducer(state, {
      type: 'diagram/update-config',
      diagramId,
      config: {
        ...effectiveConfigFromState(state, diagramId),
        fontSize: 21,
        flowchart: {
          ...effectiveConfigFromState(state, diagramId).flowchart,
          rankSpacing: 120,
        },
      },
    })

    const switched = appStoreReducer(configured, {
      type: 'diagram/update-theme',
      diagramId,
      theme: 'amethyst',
    })

    const resolved = effectiveConfigFromState(switched, diagramId)
    expect(resolved.fontSize).toBe(21)
    expect(resolved.flowchart.rankSpacing).toBe(120)
    // a theme-specific value the user did not override should still come from the latest theme
    expect(resolved.look).toBe(CUSTOM_THEME_PRESETS.amethyst.configOverrides.look)
  })

  it('treats the last config edit as authoritative after several theme flips', () => {
    const { state, diagramId } = buildState('wireframe')

    const afterThemeA = appStoreReducer(state, {
      type: 'diagram/update-theme',
      diagramId,
      theme: 'corporate',
    })

    const afterThemeB = appStoreReducer(afterThemeA, {
      type: 'diagram/update-theme',
      diagramId,
      theme: 'amethyst',
    })

    const finalConfigValue = {
      ...effectiveConfigFromState(afterThemeB, diagramId),
      fontFamily: 'Georgia, "Times New Roman", serif',
      themeVariables: {
        ...effectiveConfigFromState(afterThemeB, diagramId).themeVariables,
        lineColor: '#123456',
      },
    }

    const afterConfigEdit = appStoreReducer(afterThemeB, {
      type: 'diagram/update-config',
      diagramId,
      config: finalConfigValue,
    })

    const resolved = effectiveConfigFromState(afterConfigEdit, diagramId)
    expect(resolved.fontFamily).toBe('Georgia, "Times New Roman", serif')
    expect(resolved.themeVariables.lineColor).toBe('#123456')
    expect(resolved.look).toBe(CUSTOM_THEME_PRESETS.amethyst.configOverrides.look)
  })

  it('allows switching to base theme to expose color overrides without losing the latest override values', () => {
    const { state, diagramId } = buildState('corporate')

    const edited = appStoreReducer(state, {
      type: 'diagram/update-config',
      diagramId,
      config: {
        ...effectiveConfigFromState(state, diagramId),
        themeVariables: {
          ...effectiveConfigFromState(state, diagramId).themeVariables,
          primaryColor: '#ff00aa',
          primaryTextColor: '#111111',
        },
      },
    })

    const switchedToBase = appStoreReducer(edited, {
      type: 'diagram/update-theme',
      diagramId,
      theme: 'base',
    })

    const resolved = effectiveConfigFromState(switchedToBase, diagramId)
    expect(resolved.themeVariables.primaryColor).toBe('#ff00aa')
    expect(resolved.themeVariables.primaryTextColor).toBe('#111111')
    expect(switchedToBase.pages[0]!.diagrams[0]!.mermaidTheme).toBe('base')
  })

  it('lets the latest theme selection win for preset-owned values that the user never changed', () => {
    const { state, diagramId } = buildState('wireframe')

    const switched = appStoreReducer(state, {
      type: 'diagram/update-theme',
      diagramId,
      theme: 'corporate',
    })

    const resolved = effectiveConfigFromState(switched, diagramId)
    expect(resolved.look).toBe(CUSTOM_THEME_PRESETS.corporate.configOverrides.look)
    expect(resolved.fontSize).toBe(CUSTOM_THEME_PRESETS.corporate.configOverrides.fontSize)
    expect(resolved.flowchart.curve).toBe(CUSTOM_THEME_PRESETS.corporate.configOverrides.flowchart?.curve)
  })
})
