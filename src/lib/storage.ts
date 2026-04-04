import { createArtboard, nextArtboardPosition } from '../types'
import type { DiagramPage, Artboard } from '../types'

const PREFIX = 'mermaid-renderer:'

export const STORAGE_KEYS = {
  pages: `${PREFIX}pages`,
  activePageId: `${PREFIX}active-page-id`,
  mode: `${PREFIX}mode`,
  mermaidTheme: `${PREFIX}mermaid-theme`,
  diagramConfig: `${PREFIX}diagram-config`,
  editorLigatures: `${PREFIX}editor-ligatures`,
  autoFormat: `${PREFIX}auto-format`,
} as const

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

/**
 * Migrates old-format pages (with `code` directly on the page, no artboards)
 * to the new format (pages contain artboards). Safe to call on already-migrated data.
 */
export function migratePages(raw: unknown[]): DiagramPage[] {
  return raw.map((item) => {
    const p = item as Record<string, unknown>

    // Already new format
    if (Array.isArray(p.artboards)) {
      return p as unknown as DiagramPage
    }

    // Old format: { id, name, code, mermaidTheme, configOverrides, diagramConfig, folderId }
    const position = { x: 0, y: 0 }
    const artboard = createArtboard(
      (p.name as string) ?? 'Diagram',
      (p.code as string) ?? '',
      position,
    )
    artboard.mermaidTheme = p.mermaidTheme as Artboard['mermaidTheme']
    artboard.configOverrides = (p.configOverrides ?? {}) as Artboard['configOverrides']

    return {
      id: p.id as string,
      name: p.name as string,
      artboards: [artboard],
      activeArtboardId: artboard.id,
    } satisfies DiagramPage
  })
}

/**
 * Load pages from storage, applying migration if needed.
 */
export function loadPages(fallback: DiagramPage[]): DiagramPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pages)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return migratePages(parsed)
  } catch {
    return fallback
  }
}

/**
 * Returns the next grid position for a new artboard within a page.
 * Re-exported here for convenience so callers don't need to import from types.
 */
export { nextArtboardPosition }
