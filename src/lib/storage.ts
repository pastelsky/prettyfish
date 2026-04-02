const PREFIX = 'mermaid-renderer:'

export const STORAGE_KEYS = {
  code: `${PREFIX}code`,
  mode: `${PREFIX}mode`,
  mermaidTheme: `${PREFIX}mermaid-theme`,
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
