/**
 * Contrast Audit Page — served at /contrast-audit
 *
 * A minimal harness page that:
 *  1. Uses the app's real renderDiagram() + CUSTOM_THEME_PRESETS pipeline
 *  2. Exposes window.renderDiagram() for Playwright tests to call
 *  3. Renders diagrams into #output and sets window.__ready when initialised
 *
 * This means contrast tests exercise EXACTLY the same rendering code as users.
 * Never shown in production navigation — only reachable at /contrast-audit.
 */

import { useEffect } from 'react'
import { renderDiagram } from '@/lib/render'
import { CUSTOM_THEME_PRESETS } from '@/lib/themePresets'
import type { Diagram, MermaidTheme } from '@/types'

// Expose a minimal API for Playwright to call via page.evaluate()
declare global {
  interface Window {
    __ready: boolean
    __renderForAudit: (
      code: string,
      themeId: string,
      configOverrides?: Record<string, unknown>
    ) => Promise<{ ok: boolean; error?: string }>
  }
}

export function ContrastAuditPage() {
  useEffect(() => {
    // Expose render function for Playwright
    window.__renderForAudit = async (code, themeId, configOverrides = {}) => {
      const preset = CUSTOM_THEME_PRESETS[themeId]
      if (!preset) return { ok: false, error: `Unknown theme: ${themeId}` }

      const diagram: Diagram = {
        id: 'audit',
        code,
        mermaidTheme: themeId as MermaidTheme,
        configOverrides: configOverrides as Diagram['configOverrides'],
        name: 'audit',
        // x/y/width are canvas layout props, not needed for rendering
        x: 0,
        y: 0,
        width: 800,
      }

      // Apply background to page so getComputedStyle on bg works correctly
      const bg = preset.themeVariables.background ?? '#ffffff'
      document.body.style.background = bg
      document.documentElement.style.background = bg

      const result = await renderDiagram(diagram)

      if (result.error) {
        return { ok: false, error: result.error.message }
      }

      const output = document.getElementById('output')
      if (output) output.innerHTML = result.svg

      return { ok: true }
    }

    window.__ready = true
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <div id="output" />
    </div>
  )
}
