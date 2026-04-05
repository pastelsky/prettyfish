/**
 * File save/load utilities for Pretty Fish project files (.prettyfish.json).
 *
 * The file format is just the serialized AppState with a version field
 * for future-proofing migrations.
 */
import type { AppState } from '../types'
import { normalizeAppState } from './documentState'

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
        const state = normalizeAppState(raw)
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

