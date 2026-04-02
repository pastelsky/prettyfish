export type AppMode = 'light' | 'dark'
export type MermaidTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base'

export interface AppState {
  code: string
  mode: AppMode
  mermaidTheme: MermaidTheme
}

export const MERMAID_THEMES: { value: MermaidTheme; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
]

export const DEFAULT_DIAGRAM = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A`
