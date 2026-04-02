import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { MermaidTheme } from '../types'

let renderCounter = 0

export interface MermaidRenderResult {
  svg: string
  error: string | null
}

/**
 * Debounced mermaid renderer. Re-renders whenever code or theme changes.
 * Re-initializes mermaid when the theme changes.
 */
export function useMermaidRenderer(code: string, theme: MermaidTheme): MermaidRenderResult {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-initialize mermaid when theme changes
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' })
  }, [theme])

  // Debounced render on code or theme change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const trimmed = code.trim()
      if (!trimmed) {
        setSvg('')
        setError(null)
        return
      }
      try {
        const id = `mermaid-render-${++renderCounter}`
        const { svg: rendered } = await mermaid.render(id, trimmed)
        setSvg(rendered)
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
        setSvg('')
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [code, theme])

  return { svg, error }
}
