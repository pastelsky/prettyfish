/**
 * mermaidAltClick.ts
 *
 * CodeMirror extension that provides:
 * 1. Rich documentation tooltip on hover over recognized Mermaid tokens
 * 2. Alt+click handler to open the full reference docs panel
 * 3. Pointer cursor when Alt is held
 */

import { hoverTooltip, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { lookupTokenAt, type TokenRef } from './mermaidTokenLookup'
import { getRef } from './reference'
import type { RefElement } from './reference'
import { detectDiagramType } from './detectDiagram'

/**
 * Try the AST-based lookup first, then fall back to keyword-text matching
 * against the reference data for the detected diagram type.
 */
function lookupRefAt(state: import('@codemirror/state').EditorState, pos: number): { ref: TokenRef; element: RefElement } | null {
  // 1. Try AST-based token lookup
  const astRef = lookupTokenAt(state, pos)
  if (astRef) {
    const diagramRef = getRef(astRef.diagramType)
    const element = diagramRef.elements.find(e => e.name === astRef.elementName)
    if (element) return { ref: astRef, element }
  }

  // 2. Fallback: match the word under cursor against reference element names
  const line = state.doc.lineAt(pos)
  const col = pos - line.from
  const lineText = line.text

  // Extract word at position
  let start = col, end = col
  while (start > 0 && /[\w-]/.test(lineText[start - 1]!)) start--
  while (end < lineText.length && /[\w-]/.test(lineText[end]!)) end++
  const word = lineText.slice(start, end).trim()
  if (!word || word.length < 2) return null

  // Detect diagram type and look up reference
  const fullText = state.doc.toString()
  const diagType = detectDiagramType(fullText)
  if (diagType === 'other') return null

  const diagramRef = getRef(diagType)
  // Try exact match on element name, then partial match
  const element = diagramRef.elements.find(e =>
    e.name.toLowerCase() === word.toLowerCase() ||
    e.name.toLowerCase().startsWith(word.toLowerCase()) ||
    e.syntax.toLowerCase().startsWith(word.toLowerCase())
  )
  if (!element) return null

  return { ref: { diagramType: diagType, elementName: element.name }, element }
}

export function mermaidAltClickExtension(
  onAltClick: (ref: TokenRef) => void,
  isDark: boolean,
): Extension {
  // 1. Rich hover tooltip — shows documentation for recognized tokens
  const hover = hoverTooltip((view, pos) => {
    const result = lookupRefAt(view.state, pos)
    if (!result) return null

    const { element } = result

    return {
      pos,
      above: true,
      strictSide: false,
      arrow: false,
      create() {
        const dom = document.createElement('div')
        dom.className = 'cm-mermaid-doc-tooltip'
        dom.dataset.theme = isDark ? 'dark' : 'light'

        // Title row
        const title = document.createElement('div')
        title.className = 'cm-mermaid-doc-title'
        title.textContent = element.name

        // Syntax
        const syntax = document.createElement('code')
        syntax.className = 'cm-mermaid-doc-syntax'
        syntax.textContent = element.syntax

        // Description
        const desc = document.createElement('div')
        desc.className = 'cm-mermaid-doc-desc'
        desc.textContent = element.description

        // Alt+click hint
        const hint = document.createElement('div')
        hint.className = 'cm-mermaid-doc-hint'
        hint.textContent = '⌥ click to open full docs'

        dom.appendChild(title)
        dom.appendChild(syntax)
        dom.appendChild(desc)
        dom.appendChild(hint)
        return { dom }
      },
    }
  }, { hoverTime: 450, hideOn: () => false })

  // 2. Alt+click handler — opens the full reference docs panel
  const clickHandler = EditorView.domEventHandlers({
    click(event, view) {
      if (!event.altKey) return false

      const coords = { x: event.clientX, y: event.clientY }
      const pos = view.posAtCoords(coords)
      if (pos == null) return false

      const result = lookupRefAt(view.state, pos)
      if (!result) return false

      event.preventDefault()
      event.stopPropagation()
      onAltClick(result.ref)
      return true
    },
  })

  // 3. Alt-held cursor style
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

  // 4. Theme for alt-held state
  const altTheme = EditorView.baseTheme({
    '&light.cm-alt-held .cm-content': { cursor: 'pointer' },
    '&dark.cm-alt-held .cm-content': { cursor: 'pointer' },
  })

  return [hover, clickHandler, altCursorStyle, altTheme]
}
