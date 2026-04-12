import { afterEach, describe, expect, test, vi } from 'vitest'

import { decodeStateFromHash } from '../share'
import { normalizeAppState, normalizePages, normalizePersistedDocumentState } from '../documentState'
import { MERMAID_THEMES } from '../../types'
import { THEME_PRESET_DEFS } from '../themePresetDefs'

// ── Theme registration sanity check ────────────────────────────────────────────
// Rules:
//  1. Every ACTIVE (non-disabled) theme in THEME_PRESET_DEFS must be in MERMAID_THEMES.
//  2. Every custom theme in MERMAID_THEMES must have a definition in THEME_PRESET_DEFS.
// Disabled themes are kept in THEME_PRESET_DEFS for backwards compat but may be
// omitted from MERMAID_THEMES — that is intentional and not checked here.
test('all active themes are registered in MERMAID_THEMES and vice versa', () => {
  const inMermaidThemes = new Set(MERMAID_THEMES.map(t => t.value))
  const inPresetDefs = new Set(Object.keys(THEME_PRESET_DEFS))

  // Active themes must appear in MERMAID_THEMES
  const activeIds = Object.entries(THEME_PRESET_DEFS)
    .filter(([, def]) => !def.disabled)
    .map(([id]) => id)
  const missingFromMermaidThemes = activeIds.filter(id => !inMermaidThemes.has(id as never))
  expect(
    missingFromMermaidThemes,
    `Active theme(s) not in MERMAID_THEMES (add to src/types.ts): ${missingFromMermaidThemes.join(', ')}`
  ).toEqual([])

  // Custom themes in MERMAID_THEMES must have a preset definition
  const customIds = MERMAID_THEMES.filter(t => t.group === 'custom').map(t => t.value)
  const missingFromDefs = customIds.filter(id => !inPresetDefs.has(id))
  expect(
    missingFromDefs,
    `Theme(s) in MERMAID_THEMES but not in THEME_PRESET_DEFS (add to themePresetDefs.ts): ${missingFromDefs.join(', ')}`
  ).toEqual([])
})

const originalWindow = globalThis.window

afterEach(() => {
  vi.restoreAllMocks()
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window')
  } else {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, writable: true, configurable: true })
  }
})

describe('document state normalization', () => {
  test('rejects only non-object persisted snapshots and recovers object-shaped ones', () => {
    expect(normalizePersistedDocumentState(null)).toBeNull()
    expect(normalizePersistedDocumentState('bad')).toBeNull()

    const recoveredEmpty = normalizePersistedDocumentState({})
    expect(recoveredEmpty).not.toBeNull()
    expect(recoveredEmpty!.pages).toHaveLength(1)
    expect(recoveredEmpty!.pages[0]!.name).toBe('Page 1')
    expect(recoveredEmpty!.pages[0]!.diagrams[0]!.name).toBe('Diagram 1')

    const recoveredBadPages = normalizePersistedDocumentState({ pages: 'bad' })
    expect(recoveredBadPages).not.toBeNull()
    expect(recoveredBadPages!.pages).toHaveLength(1)

    const recoveredEmptyPages = normalizePersistedDocumentState({ pages: [] })
    expect(recoveredEmptyPages).not.toBeNull()
    expect(recoveredEmptyPages!.pages).toHaveLength(1)
  })

  test('migrates legacy page shape into diagram pages', () => {
    const normalized = normalizePersistedDocumentState({
      pages: [
        {
          id: 'page-1',
          name: 'Legacy Page',
          code: 'flowchart TD\nA-->B',
          mermaidTheme: 'forest',
          configOverrides: { look: 'handDrawn' },
        },
      ],
      activePageId: 'page-1',
      mode: 'dark',
      editorLigatures: false,
      autoFormat: false,
    })

    expect(normalized).not.toBeNull()
    expect(normalized!.pages).toHaveLength(1)
    expect(normalized!.pages[0]!.name).toBe('Legacy Page')
    expect(normalized!.pages[0]!.diagrams).toHaveLength(1)
    expect(normalized!.pages[0]!.diagrams[0]!.name).toBe('Diagram 1')
    expect(normalized!.pages[0]!.diagrams[0]!.code).toContain('flowchart TD')
    expect(normalized!.pages[0]!.diagrams[0]!.mermaidTheme).toBe('forest')
  })

  test('repairs partial current-format snapshots and falls back to safe defaults', () => {
    const normalized = normalizePersistedDocumentState({
      pages: [
        {
          name: '',
          diagrams: [
            {
              code: 42,
              width: -100,
              mermaidTheme: 'not-a-theme',
            },
          ],
          activeDiagramId: 'missing-diagram',
        },
      ],
      activePageId: 'missing-page',
      mode: 'sepia',
      editorLigatures: 'yes',
      autoFormat: 'nope',
    })

    expect(normalized).not.toBeNull()
    expect(normalized!.pages[0]!.name).toBe('Page 1')
    expect(normalized!.pages[0]!.diagrams[0]!.name).toBe('Diagram 1')
    expect(normalized!.pages[0]!.diagrams[0]!.code).toBe('')
    expect(normalized!.pages[0]!.diagrams[0]!.width).toBe(640)
    // 'not-a-theme' is invalid — should fall back to any valid theme value
    const validThemeValues = MERMAID_THEMES.map(t => t.value)
    expect(validThemeValues).toContain(normalized!.pages[0]!.diagrams[0]!.mermaidTheme)
    expect(normalized!.activePageId).toBe(normalized!.pages[0]!.id)
    expect(normalized!.pages[0]!.activeDiagramId).toBe(normalized!.pages[0]!.diagrams[0]!.id)
    expect(normalized!.mode).toBe('light')
    expect(normalized!.editorLigatures).toBe(true)
    expect(normalized!.autoFormat).toBe(true)
  })

  test('drops unusable page entries but preserves valid ones', () => {
    const pages = normalizePages([
      null,
      { foo: 'bar' },
      { id: 'valid-page', name: 'Valid', diagrams: [{ id: 'd1', name: 'Good', code: 'flowchart TD\nA-->B' }], activeDiagramId: 'd1' },
    ])

    expect(pages).toHaveLength(2)
    expect(pages.some((page) => page.id === 'valid-page')).toBe(true)
    expect(pages[0]!.diagrams.length).toBeGreaterThan(0)
  })

  test('recovers when all persisted pages are unusable by creating a safe default workspace', () => {
    const normalized = normalizePersistedDocumentState({
      pages: [null, undefined, false],
      activePageId: 'missing',
      mode: 'dark',
    })

    expect(normalized).not.toBeNull()
    expect(normalized!.pages).toHaveLength(1)
    expect(normalized!.pages[0]!.name).toBe('Page 1')
    expect(normalized!.pages[0]!.diagrams).toHaveLength(1)
    expect(normalized!.mode).toBe('dark')
  })

  test('normalizes app state and strips unsupported top-level fields', () => {
    const normalized = normalizeAppState({
      version: 99,
      pages: [{ id: 'p1', name: 'Imported', diagrams: [{ id: 'd1', name: 'Diagram', code: 'flowchart TD\nA-->B' }], activeDiagramId: 'd1' }],
      activePageId: 'p1',
      mode: 'dark',
      editorLigatures: false,
      autoFormat: false,
      weird: 'ignored',
    })

    expect(normalized).toEqual({
      version: 1,
      pages: expect.any(Array),
      activePageId: 'p1',
      mode: 'dark',
      editorLigatures: false,
      autoFormat: false,
    })
  })
})

describe('share hash decoding', () => {
  test('returns null for malformed share hashes', () => {
    Object.defineProperty(globalThis, 'window', { value: { location: { hash: '#/d/not-valid-base64' } }, writable: true, configurable: true })
    expect(decodeStateFromHash()).toBeNull()
  })

  test('decodes and normalizes partial shared state from the url hash', () => {
    const payload = {
      pages: [{ name: 'Shared page', diagrams: [{ code: 'flowchart TD\nA-->B' }], activeDiagramId: 'missing' }],
      activePageId: 'missing-page',
      mode: 'dark',
    }
    const hash = '#/d/' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    Object.defineProperty(globalThis, 'window', { value: { location: { hash } }, writable: true, configurable: true })

    const decoded = decodeStateFromHash()
    expect(decoded).not.toBeNull()
    expect(decoded!.mode).toBe('dark')
    expect(decoded!.pages).toHaveLength(1)
    expect(decoded!.activePageId).toBe(decoded!.pages[0]!.id)
    expect(decoded!.pages[0]!.activeDiagramId).toBe(decoded!.pages[0]!.diagrams[0]!.id)
  })
})
