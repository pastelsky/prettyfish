import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { MermaidTheme, DiagramConfig } from '../types'
import { BUILTIN_THEMES } from '../types'
import { CUSTOM_THEME_PRESETS } from '../lib/themePresets'
import { pfDebug } from '../lib/debug'

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

  // Serialize diagramConfig for stable dependency comparison
  // (resolveConfig creates new objects on each call, causing infinite re-renders)
  const configJson = JSON.stringify(diagramConfig)

  // Keep a ref to diagramConfig so the effect closure can read latest without being a dep
  const diagramConfigRef = useRef(diagramConfig)
  diagramConfigRef.current = diagramConfig


  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const delay = 150
    prevCodeRef.current = code

    debounceRef.current = setTimeout(async () => {
      // Read config from ref so we always have latest without re-triggering effect
      const cfg = diagramConfigRef.current
      const trimmed = code.trim()
      pfDebug('mermaid-render', 'render scheduled fired', {
        codeLength: code.length,
        trimmedLength: trimmed.length,
        theme,
      })
      if (!trimmed) {
        pfDebug('mermaid-render', 'render skipped empty code')
        setSvg('')
        setError(null)
        return
      }

      const fontSizeStr = `${cfg.fontSize}px`
      const isCustom = !BUILTIN_THEMES.has(theme)
      const customPreset = isCustom ? CUSTOM_THEME_PRESETS[theme] : null
      const effectiveTheme = isCustom ? 'base' : theme

      mermaid.initialize({
        startOnLoad: false,
        theme: effectiveTheme as Parameters<typeof mermaid.initialize>[0]['theme'],
        securityLevel: 'loose',
        look: cfg.look,
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize,
        themeVariables: customPreset
          ? { ...customPreset.themeVariables, fontSize: fontSizeStr }
          : effectiveTheme === 'base'
            ? { ...cfg.themeVariables, fontFamily: cfg.fontFamily, fontSize: fontSizeStr }
            : { fontFamily: cfg.fontFamily, fontSize: fontSizeStr },
        flowchart: cfg.flowchart,
        sequence: cfg.sequence,
        gantt: cfg.gantt,
      })

      try {
        const id = `mermaid-render-${++renderCounter}`
        pfDebug('mermaid-render', 'render start', { id, theme, codeLength: trimmed.length })
        const { svg: rendered } = await mermaid.render(id, trimmed)
        pfDebug('mermaid-render', 'render success', { id, svgLength: rendered.length })
        if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
        setSvg(rendered)
        setError(null)
      } catch (err: unknown) {
        const parsed = parseError(err)
        pfDebug('mermaid-render', 'render error', parsed)
        setSvg('')
        if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
        errorDebounceRef.current = setTimeout(() => setError(parsed), 500)
      } finally {
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
  }, [code, theme, configJson])

  return { svg, error }
}
