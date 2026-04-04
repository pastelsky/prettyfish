/**
 * File save/load utilities for Pretty Fish project files (.prettyfish.json).
 *
 * The file format is just the serialized AppState with a version field
 * for future-proofing migrations.
 */
import type { AppState } from '../types'
import { migratePages } from './storage'

const FILE_EXTENSION = '.prettyfish.json'
const MIME_TYPE = 'application/json'

/**
 * Serialize the app state and trigger a file download.
 */
export function saveProjectFile(state: AppState, filename?: string): void {
  const name = filename ?? `prettyfish-project${FILE_EXTENSION}`
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name.endsWith(FILE_EXTENSION) ? name : `${name}${FILE_EXTENSION}`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Open a file picker and load a Pretty Fish project file.
 * Returns the parsed AppState, or null if the user cancelled or the file is invalid.
 */
export async function loadProjectFile(): Promise<AppState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.prettyfish.json'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }

      try {
        const text = await file.text()
        const raw = JSON.parse(text)
        const state = validateAndMigrate(raw)
        resolve(state)
      } catch (err) {
        console.error('[File] Failed to load project file:', err)
        resolve(null)
      }
    }

    // User cancelled the picker
    input.oncancel = () => resolve(null)

    input.click()
  })
}

/**
 * Validate and migrate a raw JSON object into a valid AppState.
 * Handles both current format and older formats gracefully.
 */
function validateAndMigrate(raw: Record<string, unknown>): AppState {
  // Must have pages
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
    throw new Error('Invalid project file: missing pages')
  }

  // Migrate pages (handles old format → new artboard format)
  const pages = migratePages(raw.pages)

  // Determine active page
  const activePageId = typeof raw.activePageId === 'string' && pages.some(p => p.id === raw.activePageId)
    ? (raw.activePageId as string)
    : pages[0]!.id

  return {
    version: 1,
    pages,
    activePageId,
    mode: (raw.mode === 'dark' || raw.mode === 'light') ? raw.mode : 'light',
    editorLigatures: typeof raw.editorLigatures === 'boolean' ? raw.editorLigatures : true,
  }
}
