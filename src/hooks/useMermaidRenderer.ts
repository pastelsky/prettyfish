import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { MermaidTheme, DiagramConfig } from '../types'
import { BUILTIN_THEMES } from '../types'
import { CUSTOM_THEME_PRESETS } from '../lib/themePresets'

let renderCounter = 0

export interface MermaidError {
  message: string
  line: number | null
  column: number | null
}

export interface MermaidRenderResult {
  svg: string
  error: MermaidError | null
}

/**
 * Attempt to extract line/column from mermaid error messages.
 * Mermaid errors are inconsistent, so we try several patterns.
 */
function parseError(err: unknown): MermaidError {
  const raw = err instanceof Error ? err.message : String(err)

  // Extract line/column first (from the raw message before cleaning)
  let line: number | null = null
  let column: number | null = null

  // Pattern: "Parse error on line 5:" or "Error on line 3"
  const lineMatch = raw.match(/(?:on |at )line\s+(\d+)/i)
  if (lineMatch) line = parseInt(lineMatch[1], 10)

  // Pattern: "line 5:12" or "at line 3 column 7"
  const lineColMatch = raw.match(/line\s+(\d+)(?::|\s*column\s*)(\d+)/i)
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10)
    column = parseInt(lineColMatch[2], 10)
  }

  // Pattern: "Expecting ..., got 'XYZ' ... line: 5"
  const altLineMatch = raw.match(/line:\s*(\d+)/i)
  if (!line && altLineMatch) line = parseInt(altLineMatch[1], 10)

  // Pattern: "UnknownDiagramError" at beginning usually means line 1
  if (!line && /unknown diagram/i.test(raw)) line = 1

  // ── Clean up the message ──
  // Mermaid error messages can include:
  //   - "Parse error on line N:\n...code...\n-----^\n..."
  //   - "Syntax error in text\nmermaid version 11.x.x"
  //   - "💣 ..." (bomb emoji from mermaid's internal error rendering)
  //   - Error object prefix "Error: "

  let message = raw
    // Strip "Error: " prefix
    .replace(/^Error:\s+/i, '')
    // Strip trailing "Syntax error in text\nmermaid version X.X.X" boilerplate
    .replace(/\nSyntax error in text[\s\S]*/i, '')
    // Strip "Syntax error in text\nmermaid version X.X.X" if it's the whole message
    .replace(/^Syntax error in text[\s\S]*/i, 'Syntax error')
    // Strip bomb emoji and surrounding text that mermaid sometimes adds
    .replace(/💣\s*/g, '')
    // Strip code excerpt with arrow pointer (lines like "...code...\n----^\n")
    .replace(/\n\.{3}.*\n[-^]+\n?/g, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // If the message is now empty or only whitespace, fallback
  if (!message || message.length < 3) {
    message = 'Syntax error — check your diagram code'
  }

  return { message, line, column }
}

/**
 * Debounced mermaid renderer. Re-renders whenever code, theme, or diagram config changes.
 * initialize() is always called before render() to ensure config is applied.
 */
export function useMermaidRenderer(
  code: string,
  theme: MermaidTheme,
  diagramConfig: DiagramConfig,
): MermaidRenderResult {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<MermaidError | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCodeRef = useRef<string>(code)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Render immediately on success path, but delay errors so they don't flash mid-keystroke
    // We don't know yet if it'll succeed, so use short delay — but on error we'll re-delay
    const delay = 150
    prevCodeRef.current = code

    debounceRef.current = setTimeout(async () => {
      const trimmed = code.trim()
      if (!trimmed) {
        setSvg('')
        setError(null)
        return
      }

      const fontSizeStr = `${diagramConfig.fontSize}px`
      const isCustom = !BUILTIN_THEMES.has(theme)
      const customPreset = isCustom ? CUSTOM_THEME_PRESETS[theme] : null
      const effectiveTheme = isCustom ? 'base' : theme

      mermaid.initialize({
        startOnLoad: false,
        theme: effectiveTheme,
        securityLevel: 'loose',
        look: diagramConfig.look,
        fontFamily: diagramConfig.fontFamily,
        fontSize: diagramConfig.fontSize,
        themeVariables: customPreset
          // Custom preset: use preset colors
          ? { ...customPreset.themeVariables, fontSize: fontSizeStr }
          // Built-in 'base' theme: user controls colors via config panel
          : effectiveTheme === 'base'
            ? { ...diagramConfig.themeVariables, fontFamily: diagramConfig.fontFamily, fontSize: fontSizeStr }
            // Other built-in themes (default, neutral, dark, forest): only pass font info,
            // don't pass color themeVariables or they'll override the theme's own palette
            : { fontFamily: diagramConfig.fontFamily, fontSize: fontSizeStr },
        flowchart: diagramConfig.flowchart,
        sequence: diagramConfig.sequence,
        gantt: diagramConfig.gantt,
      })

      try {
        const id = `mermaid-render-${++renderCounter}`
        const { svg: rendered } = await mermaid.render(id, trimmed)
        // Success — cancel any pending error reveal and clear immediately
        if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
        setSvg(rendered)
        setError(null)
      } catch (err: unknown) {
        const parsed = parseError(err)
        setSvg('')
        // Delay showing the error 500ms so it doesn't flash while still typing
        if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
        errorDebounceRef.current = setTimeout(() => setError(parsed), 500)
      } finally {
        // Mermaid sometimes injects error <pre> elements into the body — clean them up
        document.querySelectorAll('body > [id^="mermaid-render-"]').forEach(el => el.remove())
        document.querySelectorAll('body > .mermaid-error, body > pre').forEach(el => {
          if (el.textContent?.includes('mermaid') || el.textContent?.includes('💣')) el.remove()
        })
      }
    }, delay)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
    }
  }, [code, theme, diagramConfig])

  return { svg, error }
}
