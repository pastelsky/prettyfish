/**
 * mermaidAltClick.ts
 *
 * CodeMirror extension that provides:
 * 1. A hover tooltip showing "⌥ click → element" when hovering
 *    over a token that has a reference entry.
 * 2. Alt+click handler that fires onAltClick(TokenRef) to open the
 *    docs panel scrolled to the right element.
 * 3. Underline decoration on the hovered token when Alt is held.
 */

import { hoverTooltip, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { lookupTokenAt, type TokenRef } from './mermaidTokenLookup'

export function mermaidAltClickExtension(
  onAltClick: (ref: TokenRef) => void,
  isDark: boolean,
): Extension {
  // 1. Hover tooltip — shows the hint text for recognized tokens
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
        dom.dataset.theme = isDark ? 'dark' : 'light'

        const kbd = document.createElement('kbd')
        kbd.className = 'cm-mermaid-ref-kbd'
        kbd.textContent = '⌥ click'

        const label = document.createElement('span')
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

  // 3. Alt-held cursor style — pointer cursor + underline hint via CSS class
  const altCursorStyle = EditorView.domEventHandlers({
    keydown(event, view) {
      if (event.key === 'Alt') {
        view.dom.classList.add('cm-alt-held')
      }
      return false
    },
    keyup(event, view) {
      if (event.key === 'Alt') {
        view.dom.classList.remove('cm-alt-held')
      }
      return false
    },
    blur(_event, view) {
      view.dom.classList.remove('cm-alt-held')
      return false
    },
  })

  // 4. Theme for alt-held state — pointer cursor on the content area
  const altTheme = EditorView.baseTheme({
    '&light.cm-alt-held .cm-content': {
      cursor: 'pointer',
    },
    '&dark.cm-alt-held .cm-content': {
      cursor: 'pointer',
    },
  })

  return [hover, clickHandler, altCursorStyle, altTheme]
}
