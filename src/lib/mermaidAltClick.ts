/**
 * mermaidAltClick.ts
 *
 * CodeMirror extension that provides:
 * 1. A hover tooltip showing "⌥ click to open docs" when hovering
 *    over a token that has a reference entry.
 * 2. Alt+click handler that fires onAltClick(TokenRef) to open the
 *    docs panel scrolled to the right element.
 */

import { hoverTooltip, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { lookupTokenAt, type TokenRef } from './mermaidTokenLookup'

export function mermaidAltClickExtension(
  onAltClick: (ref: TokenRef) => void,
  isDark: boolean,
): Extension {
  // 1. Hover tooltip — only shows the hint text, not a full docs preview
  const hover = hoverTooltip((view, pos) => {
    const ref = lookupTokenAt(view.state, pos)
    if (!ref) return null

    return {
      pos,
      above: true,
      strictSide: false,
      arrow: false,
      create() {
        const dom = document.createElement('div')
        dom.className = 'cm-mermaid-ref-tooltip'
        dom.style.cssText = [
          'display:flex',
          'align-items:center',
          'gap:5px',
          'padding:4px 8px',
          'border-radius:5px',
          'font-size:11px',
          'font-family:var(--font-sans)',
          'line-height:1.4',
          'pointer-events:none',
          isDark
            ? 'background:oklch(0.22 0.015 260);color:oklch(0.75 0.02 260);border:1px solid oklch(0.3 0.015 260)'
            : 'background:#fff;color:#444;border:1px solid #e2e8f0',
        ].join(';')

        // Alt symbol + label
        const kbd = document.createElement('kbd')
        kbd.style.cssText = [
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'padding:1px 5px',
          'border-radius:3px',
          'font-size:10px',
          'font-family:inherit',
          isDark
            ? 'background:oklch(0.28 0.015 260);color:oklch(0.85 0.015 260);border:1px solid oklch(0.35 0.015 260)'
            : 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1',
        ].join(';')
        kbd.textContent = '⌥ click'

        const label = document.createElement('span')
        // Shorten the element name for tooltip brevity
        label.textContent = `→ ${ref.elementName}`

        dom.appendChild(kbd)
        dom.appendChild(label)
        return { dom }
      },
    }
  }, { hoverTime: 300, hideOn: () => false })

  // 2. Alt+click handler
  const clickHandler = EditorView.domEventHandlers({
    click(event, view) {
      if (!event.altKey) return false

      const coords = { x: event.clientX, y: event.clientY }
      const pos = view.posAtCoords(coords)
      if (pos == null) return false

      const ref = lookupTokenAt(view.state, pos)
      if (!ref) return false

      event.preventDefault()
      event.stopPropagation()
      onAltClick(ref)
      return true
    },
  })

  // 3. Cursor style — show pointer+alt icon when alt is held
  const cursorStyle = EditorView.domEventHandlers({
    keydown(event, view) {
      if (event.key === 'Alt') {
        view.dom.style.cursor = 'alias'
      }
      return false
    },
    keyup(event, view) {
      if (event.key === 'Alt') {
        view.dom.style.cursor = ''
      }
      return false
    },
    blur(_event, view) {
      view.dom.style.cursor = ''
      return false
    },
  })

  return [hover, clickHandler, cursorStyle]
}
